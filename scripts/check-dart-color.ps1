Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Bitmap]::FromFile((Resolve-Path "public\ielts-3d-target-dart.png").Path)
$totalR = 0; $totalG = 0; $totalB = 0; $count = 0

for ($y = 0; $y -lt $src.Height; $y += 5) {
    for ($x = 0; $x -lt $src.Width; $x += 5) {
        $c = $src.GetPixel($x, $y)
        if ($c.A -gt 50) {
            $totalR += $c.R
            $totalG += $c.G
            $totalB += $c.B
            $count++
        }
    }
}

$avgR = [int]($totalR / $count)
$avgG = [int]($totalG / $count)
$avgB = [int]($totalB / $count)

Write-Host "Non-transparent pixel count: $count"
Write-Host "Average Color: R=$avgR, G=$avgG, B=$avgB"

$src.Dispose()
