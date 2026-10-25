Add-Type -AssemblyName System.Drawing

$p1 = "public\ielts-card-aa-icon.png"
$bmp1 = [System.Drawing.Bitmap]::FromFile((Resolve-Path $p1).Path)
Write-Host "Aa icon: $($bmp1.Width)x$($bmp1.Height), corner pixel: R=$($bmp1.GetPixel(0,0).R), G=$($bmp1.GetPixel(0,0).G), B=$($bmp1.GetPixel(0,0).B), A=$($bmp1.GetPixel(0,0).A)"
$bmp1.Dispose()

$p2 = "public\ielts-card-band-badge.png"
$bmp2 = [System.Drawing.Bitmap]::FromFile((Resolve-Path $p2).Path)
Write-Host "Band icon: $($bmp2.Width)x$($bmp2.Height), corner pixel: R=$($bmp2.GetPixel(0,0).R), G=$($bmp2.GetPixel(0,0).G), B=$($bmp2.GetPixel(0,0).B), A=$($bmp2.GetPixel(0,0).A)"
$bmp2.Dispose()
