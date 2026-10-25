Add-Type -AssemblyName System.Drawing

function Resize-Image {
    param([string]$inputPath, [string]$outputPath, [int]$w, [int]$h)
    $src = [System.Drawing.Image]::FromFile($inputPath)
    $dest = New-Object System.Drawing.Bitmap($w, $h)
    $graphics = [System.Drawing.Graphics]::FromImage($dest)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.DrawImage($src, 0, 0, $w, $h)
    $dest.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $dest.Dispose()
    $src.Dispose()
    Write-Host "Created $outputPath ($w x $h)"
}

$source = (Resolve-Path "Glossy Pastel W App Icon.png").Path

# 1. Copy full-res images
Copy-Item -Path $source -Destination "public\app-logo.png" -Force
Copy-Item -Path $source -Destination "public\avatarandlogo.png" -Force
Copy-Item -Path $source -Destination "avatarandlogo.png" -Force
Copy-Item -Path $source -Destination "Icon WEB APP\Glossy Pastel W App Icon.png" -Force
Copy-Item -Path $source -Destination "public\Glossy Pastel W App Icon.png" -Force

# 2. Resize into standard web & PWA resolutions
Resize-Image -inputPath $source -outputPath "public\icon-512.png" -w 512 -h 512
Resize-Image -inputPath $source -outputPath "public\icon-192.png" -w 192 -h 192
Resize-Image -inputPath $source -outputPath "public\apple-touch-icon.png" -w 180 -h 180
Resize-Image -inputPath $source -outputPath "public\favicon.png" -w 64 -h 64
Resize-Image -inputPath $source -outputPath "public\favicon-32.png" -w 32 -h 32
Resize-Image -inputPath $source -outputPath "public\favicon-16.png" -w 16 -h 16

# 3. Create favicon.ico
$icoBmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path "public\favicon-32.png").Path)
$hIcon = $icoBmp.GetHicon()
$icoObj = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = New-Object System.IO.FileStream ((Resolve-Path "public").Path + "\favicon.ico"), ([System.IO.FileMode]::Create)
$icoObj.Save($fs)
$fs.Close()
$icoBmp.Dispose()
Write-Host "Created public\favicon.ico"

Write-Host "Done generating app icon assets successfully."
