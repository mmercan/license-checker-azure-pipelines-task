param (
    [string]$token
)
function update-extensionjson {
    $jobj = Get-Content '.\vss-extension.json' -raw | ConvertFrom-Json
    $versionArr = $jobj.version.split(".")
    $majorNumber = [int]$versionArr[0]
    $minorNumber = [int]$versionArr[1]
    $buildNumber = [int]$versionArr[2]
    
    "Build Number " + ++$buildNumber
    $newVersion = [string]::Format("{0}.{1}.{2}", $majorNumber, $minorNumber, $buildNumber)
    
    $jobj.version = $newVersion
        
    $json = $jobj| ConvertTo-Json -Depth 3
    $json | set-content  '.\vss-extension.json'
}



function update-taskjson {

    $jobj = Get-Content '.\extension\task.json' -raw | ConvertFrom-Json
    
    $Major = $jobj.version.Major
    $Minor = $jobj.version.Minor
    $oldpatch = $jobj.version.Patch


    $patch = ++$jobj.version.Patch
    $patch
    $jobj.version| ForEach-Object { 
        $_.Patch = $patch
    }
    $json = $jobj| ConvertTo-Json -Depth 3
    $json | set-content  '.\extension\task.json'

    $fullversion = "Version:" + $Major + '.' + $Minor + '.' + $patch
    $oldversion = "Version:" + $Major + '.' + $Minor + '.' + $oldpatch

    $fullversion

    $jobj2 = Get-Content '.\extension\task.json'
    $jobj2 = $jobj2.replace($oldversion, $fullversion)
    $jobj2 | set-content  ".\extension\task.json"
}



$extfolderName = "extension"
$scriptpath = $MyInvocation.MyCommand.Path 
$dir = Split-Path $scriptpath 
$extfolder = $dir + "\" + $extfolderName
Set-Location -Path $extfolder

tsc app.ts --lib es2015

Set-Location -Path $dir
update-extensionjson
update-taskjson




tfx extension publish --publisher mmercan2 --token ekv2lk3f2p3mfk7t4rk6n2n2hf4u6ghrxcvp26dofnts533t6xga
move-item *.vsix ./outputs -force

