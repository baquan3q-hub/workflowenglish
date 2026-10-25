Add-Type -AssemblyName System.Drawing

$p = (Resolve-Path "Glossy IELTS Study Icon Composition.png").Path
$bmp = [System.Drawing.Bitmap]::FromFile($p)

# Let's save a clean transparent trimmed version of the 3D composition:
$minX = 300
$maxX = 1455
$minY = 80
$maxY = 855
$rect = New-Object System.Drawing.Rectangle($minX, $minY, ($maxX - $minX), ($maxY - $minY))
$trimmed = $bmp.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$trimmed.Save("public\ielts-study-composition.png", [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Created public\ielts-study-composition.png ($($trimmed.Width) x $($trimmed.Height))"

$trimmed.Dispose()
$bmp.Dispose()
