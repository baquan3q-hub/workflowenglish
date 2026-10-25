Add-Type -AssemblyName System.Drawing

$p = "public\ielts-study-composition.png"
$bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path $p).Path)
Write-Host "Size: $($bmp.Width) x $($bmp.Height)"

$corners = @(
    [System.Drawing.Point]::new(5, 5),
    [System.Drawing.Point]::new($bmp.Width - 5, 5),
    [System.Drawing.Point]::new(5, $bmp.Height - 5),
    [System.Drawing.Point]::new($bmp.Width - 5, $bmp.Height - 5)
)

foreach ($pt in $corners) {
    $c = $bmp.GetPixel($pt.X, $pt.Y)
    Write-Host "Pixel at ($($pt.X), $($pt.Y)): R=$($c.R), G=$($c.G), B=$($c.B), Alpha=$($c.A)"
}

$bmp.Dispose()
