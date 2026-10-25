$pathsToSearch = @(
    ".",
    "..\..",
    "C:\Users\Baquan\OneDrive\Máy tính",
    "C:\Users\Baquan\Desktop",
    "C:\Users\Baquan\Downloads"
)

foreach ($p in $pathsToSearch) {
    if (Test-Path $p) {
        Write-Host "Searching in $p..."
        Get-ChildItem -Path $p -Recurse -Depth 3 -ErrorAction SilentlyContinue | Where-Object {
            $_.Name -like "*bia*phi*tieu*" -or
            $_.Name -like "*phi*tieu*" -or
            $_.Name -like "*Bi?u t??ng bia*" -or
            $_.Name -like "*bóng bẩy*" -or
            $_.Name -like "*bong bay*" -or
            $_.Name -like "*dart*"
        } | Select-Object FullName, Length
    }
}
