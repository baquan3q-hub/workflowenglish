Add-Type -AssemblyName System.Drawing

$file = Get-Item "B*ng ki*m b*ng b*y*.png"
Write-Host "Found file: $($file.FullName)"
$bmp = [System.Drawing.Bitmap]::FromFile($file.FullName)
Write-Host "Size: $($bmp.Width) x $($bmp.Height)"
Write-Host "PixelFormat: $($bmp.PixelFormat)"

# Sample 4 corners
$corners = @(
    $bmp.GetPixel(5, 5),
    $bmp.GetPixel($bmp.Width - 5, 5),
    $bmp.GetPixel(5, $bmp.Height - 5),
    $bmp.GetPixel($bmp.Width - 5, $bmp.Height - 5)
)

foreach ($c in $corners) {
    Write-Host "Corner: R=$($c.R), G=$($c.G), B=$($c.B), Alpha=$($c.A)"
}

$bmp.Dispose()
