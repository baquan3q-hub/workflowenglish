Add-Type -AssemblyName System.Drawing

$imgComp = [System.Drawing.Bitmap]::FromFile((Resolve-Path "Glossy IELTS Study Icon Composition.png").Path)
Write-Host "Glossy IELTS Study Icon Composition size: $($imgComp.Width) x $($imgComp.Height)"

# Sample non-transparent pixels to find what is depicted
# Let's crop a 300x300 center thumbnail of the composition to see its center
$rect = New-Object System.Drawing.Rectangle(500, 200, 600, 500)
$centerCrop = $imgComp.Clone($rect, $imgComp.PixelFormat)
$centerCrop.Save("public\comp-center.png", [System.Drawing.Imaging.ImageFormat]::Png)
$centerCrop.Dispose()
$imgComp.Dispose()

Write-Host "Saved public\comp-center.png"
