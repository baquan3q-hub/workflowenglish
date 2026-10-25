Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Bitmap]::FromFile((Resolve-Path "Glossy IELTS Study Icon Composition.png").Path)
$rect = New-Object System.Drawing.Rectangle(290, 70, (1470 - 290), (870 - 70))
$crop = $img.Clone($rect, $img.PixelFormat)
$crop.Save("public\ielts-composition-trimmed.png", [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Trimmed composition saved: $($crop.Width) x $($crop.Height)"
$crop.Dispose()
$img.Dispose()
