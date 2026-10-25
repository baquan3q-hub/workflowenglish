Add-Type -AssemblyName System.Drawing

$srcPath = (Resolve-Path "Glossy IELTS Study Icon Composition.png").Path
$src = [System.Drawing.Bitmap]::FromFile($srcPath)
Write-Host "Source Image Size: $($src.Width) x $($src.Height)"

# Function to crop a rectangle from an image and save it
function Crop-Image {
    param([System.Drawing.Bitmap]$source, [int]$x, [int]$y, [int]$w, [int]$h, [string]$outPath)
    $rect = New-Object System.Drawing.Rectangle($x, $y, $w, $h)
    $cropped = $source.Clone($rect, $source.PixelFormat)
    $cropped.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $cropped.Dispose()
    Write-Host "Cropped to $outPath ($w x $h)"
}

# 1. Header Target Illustration (Top-Right area: certificate + target + orbit)
# Looking at the 1658x949 image, the illustration is roughly x: 900 to 1400, y: 50 to 380
Crop-Image -source $src -x 900 -y 50 -w 480 -h 330 -outPath "public\ielts-3d-header-target.png"

# 2. Writing Keycap (Aa coral block in next action card)
# Roughly x: 100 to 320, y: 390 to 550
Crop-Image -source $src -x 90 -y 380 -w 220 -h 170 -outPath "public\ielts-3d-writing-key.png"

# 3. Band Badge (5.5 blue glassy squircle in estimate card)
# Roughly x: 100 to 320, y: 640 to 800
Crop-Image -source $src -x 90 -y 640 -w 220 -h 170 -outPath "public\ielts-3d-band-badge.png"

$src.Dispose()
Write-Host "Done extracting preliminary regions."
