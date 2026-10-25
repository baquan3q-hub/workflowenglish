Add-Type -AssemblyName System.Drawing

$file = Get-Item "Bi*checklist*.png"
$bmp = [System.Drawing.Bitmap]::FromFile($file.FullName)
Write-Host "Format: $($bmp.PixelFormat)"
$corners = @(
    $bmp.GetPixel(5, 5),
    $bmp.GetPixel($bmp.Width - 5, 5),
    $bmp.GetPixel(5, $bmp.Height - 5),
    $bmp.GetPixel($bmp.Width - 5, $bmp.Height - 5)
)

foreach ($c in $corners) {
    Write-Host "Corner: R=$($c.R), G=$($c.G), B=$($c.B)"
}

# Scan from edges inward to see where background ends and foreground starts
# Sample a horizontal line across the middle
Write-Host "`nHorizontal sample Y=$([int]($bmp.Height/2)):"
for ($x = 0; $x -lt $bmp.Width; $x += 100) {
    $c = $bmp.GetPixel($x, [int]($bmp.Height/2))
    Write-Host "X=$x : R=$($c.R), G=$($c.G), B=$($c.B)"
}

$bmp.Dispose()
