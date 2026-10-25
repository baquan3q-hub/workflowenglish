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
            $_.Name -like "*checklist*" -or
            $_.Name -like "*bóng loáng*" -or
            $_.Name -like "*bong loang*" -or
            $_.Name -like "*Bi?u t??ng check*"
        } | Select-Object FullName, Length
    }
}
