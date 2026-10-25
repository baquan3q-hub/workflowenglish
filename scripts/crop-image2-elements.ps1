Add-Type -AssemblyName System.Drawing

$p = "C:\Users\Baquan\.gemini\antigravity-ide\brain\cdd47a47-4895-4dbd-a632-d4aa6269b0b2\.user_uploaded\media_1792941319436.png"
$bmp = [System.Drawing.Bitmap]::FromFile($p)
Write-Host "Image 2 Dimensions: $($bmp.Width) x $($bmp.Height)"

# 1. Next action Aa icon
# In 1024x586 image:
# Card 1 is roughly from Y=210 to 340.
# The 3D Aa icon is at roughly X=60 to 200, Y=225 to 330
$rectAa = New-Object System.Drawing.Rectangle(65, 225, 140, 105)
$cropAa = $bmp.Clone($rectAa, $bmp.PixelFormat)
$cropAa.Save("public\ielts-card-aa-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved public\ielts-card-aa-icon.png"
$cropAa.Dispose()

# 2. Band score 5.5 badge
# Card 2 is roughly from Y=360 to 510.
# The 3D 5.5 badge is at roughly X=65 to 195, Y=385 to 495
$rectBand = New-Object System.Drawing.Rectangle(65, 385, 130, 105)
$cropBand = $bmp.Clone($rectBand, $bmp.PixelFormat)
$cropBand.Save("public\ielts-card-band-badge.png", [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved public\ielts-card-band-badge.png"
$cropBand.Dispose()

$bmp.Dispose()
