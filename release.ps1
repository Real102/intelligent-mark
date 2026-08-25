# release.ps1 —— Chrome 插件一键发布到 GitHub Release
# 用法: .\release.ps1 [-Bump patch|minor|major] [-Message '提交信息'] [-Notes 'Release说明'] [-SkipBuild]
[CmdletBinding()]
param(
    [ValidateSet('patch', 'minor', 'major')]
    [string]$Bump = 'patch',

    [string]$Message = 'update',   # 本次改动的 commit 信息
    [string]$Notes = '',           # Release 说明，留空则自动生成
    [string]$SourceDir = 'dist',   # 打包源目录：本项目为 Vite 构建输出目录 dist
    [switch]$SkipBuild             # 已执行过 npm run build 时跳过构建
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
Set-Location $root

# ---------- 0. 环境检查 ----------
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw '未找到 git' }
if (-not (Get-Command gh -ErrorAction SilentlyContinue))  { throw '未找到 gh，请执行: winget install GitHub.cli 然后 gh auth login' }
if (-not $SkipBuild -and -not (Get-Command npm -ErrorAction SilentlyContinue)) { throw '未找到 npm' }

$manifestPath = Join-Path $root 'manifest.json'
$packagePath  = Join-Path $root 'package.json'
if (-not (Test-Path $manifestPath)) { throw '未找到 manifest.json，请把脚本放在插件仓库根目录（intelligent-mark）' }

# ---------- 1. 提交本地未提交的改动 ----------
git add -A
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
    git commit -m $Message
    Write-Host "已提交本地改动: $Message"
}

# ---------- 2. 同步远程（提交后再变基，避免冲突卡住） ----------
git pull --rebase
if ($LASTEXITCODE -ne 0) { throw 'git pull --rebase 失败，请手动解决冲突后重新运行本脚本' }

# ---------- 3. 递增版本号（manifest.json 与 package.json 同步，只替换版本数字，不动其他格式） ----------
$raw = [System.IO.File]::ReadAllText($manifestPath)
$m = [regex]::Match($raw, '("version"\s*:\s*")(\d+)\.(\d+)\.(\d+)(")')
if (-not $m.Success) { throw 'manifest.json 的 version 需为 "x.y.z" 三段数字格式' }

$major = [int]$m.Groups[2].Value; $minor = [int]$m.Groups[3].Value; $patch = [int]$m.Groups[4].Value
switch ($Bump) {
    'major' { $major++; $minor = 0; $patch = 0 }
    'minor' { $minor++; $patch = 0 }
    'patch' { $patch++ }
}
$newVersion = "$major.$minor.$patch"
$tag = "v$newVersion"
if (git tag -l $tag) { throw "标签 $tag 已存在。若是上次发布中断，请手动执行: git push origin HEAD --tags; gh release create $tag <zip路径> --generate-notes" }

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$start = $m.Groups[2].Index
$len = ($m.Groups[4].Index + $m.Groups[4].Length) - $start
$updated = $raw.Remove($start, $len).Insert($start, $newVersion)
[System.IO.File]::WriteAllText($manifestPath, $updated, $utf8NoBom)

if (Test-Path $packagePath) {
    $pkgRaw = [System.IO.File]::ReadAllText($packagePath)
    $pm = [regex]::Match($pkgRaw, '("version"\s*:\s*")(\d+)\.(\d+)\.(\d+)(")')
    if ($pm.Success) {
        $pStart = $pm.Groups[2].Index
        $pLen = ($pm.Groups[4].Index + $pm.Groups[4].Length) - $pStart
        $pkgUpdated = $pkgRaw.Remove($pStart, $pLen).Insert($pStart, $newVersion)
        [System.IO.File]::WriteAllText($packagePath, $pkgUpdated, $utf8NoBom)
    }
}
Write-Host "版本号 -> $newVersion"

# ---------- 4. 构建（@crxjs/vite-plugin 把 src 下的 TS 源码编译为可加载的扩展产物） ----------
if (-not $SkipBuild) {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'npm run build 失败' }
}

# ---------- 5. 打包 zip（manifest.json 在 zip 根目录；输出到 release\ 避免被 vite build 清空） ----------
$sourcePath = Join-Path $root $SourceDir
if (-not (Test-Path (Join-Path $sourcePath 'manifest.json'))) {
    throw "$SourceDir 中未找到 manifest.json，请先执行 npm run build（或去掉 -SkipBuild）"
}

$releaseDir = Join-Path $root 'release'
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
$zipPath = Join-Path $releaseDir "extension-$tag.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

# 用 .NET ZipArchive 而非 Compress-Archive：后者在 PS 5.1 生成的条目路径为反斜杠，
# 部分解压工具（老版 unzip 等）无法正确还原目录结构，这里统一写标准 '/' 分隔符
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')
try {
    $files = Get-ChildItem -Path $sourcePath -Recurse -File
    foreach ($file in $files) {
        $entryName = $file.FullName.Substring($sourcePath.Length).TrimStart('\', '/') -replace '\\', '/'
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $entryName, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
} finally {
    $zip.Dispose()
}
Write-Host "已打包: $zipPath ($($files.Count) 个文件)"

# ---------- 6. 提交版本号 + 打 tag + 推送 ----------
git add -A
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) { git commit -m "release: $tag" }
git tag -a $tag -m $tag
git push origin HEAD --follow-tags
if ($LASTEXITCODE -ne 0) { throw 'git push 失败' }

# ---------- 7. 创建 GitHub Release 并上传 zip ----------
# 注意：不要用 splatting 传 '--generate-notes'（@notesArgs 会把字符串拆成单字符参数），直接分支调用
if ($Notes) {
    gh release create $tag $zipPath --title $tag --notes $Notes
} else {
    gh release create $tag $zipPath --title $tag --generate-notes
}
if ($LASTEXITCODE -ne 0) { throw 'gh release create 失败' }

Write-Host "`n发布完成: $tag"
