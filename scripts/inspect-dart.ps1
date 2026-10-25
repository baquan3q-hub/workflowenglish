Add-Type -AssemblyName System.Drawing

$file = Get-Item "Bi*phi ti*u*.png"
Write-Host "Found file: $($file.FullName)"
$bmp = [System.Drawing.Bitmap]::FromFile($file.FullName)
Write-Host "Size: $($bmp.Width) x $($bmp.Height)"
Write-Host "PixelFormat: $($bmp.PixelFormat)"

# Sample 4 corners
$corners = @(
    [System.Drawing.Point]::new(5, 5),
    [System.Drawing.Point]::new($bmp.Width - 5, 5),
    [System.Drawing.Point]::new(5, $bmp.Height - 5),
    [System.Drawing.Point]::new($bmp.Width - 5, $bmp.Height - 5)
)

foreach ($pt in $corners) {
    $c = $bmp.GetPixel($pt.X, $pt.Y)
    Write-Host "Corner ($($pt.X), $($pt.Y)): R=$($c.R), G=$($c.G), B=$($c.B), Alpha=$($c.A)"
}

$bmp.Dispose()
