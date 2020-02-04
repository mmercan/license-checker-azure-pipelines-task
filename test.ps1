$srcfolderName = "extension"
$scriptpath = $MyInvocation.MyCommand.Path 
$dir = Split-Path $scriptpath 
$srcfolder = $dir + "\" + $srcfolderName
Set-Location -Path $srcfolder

tsc app.ts --lib es2015


# Set-Variable INPUT_FirstName="matt"
# Set-Variable LastName="Mercan"


#$env:INPUT_LastName = "Mercan"
#$env:INPUT_jsonFile = "test.json"
#$env:INPUT_FirstName = "matt"

$env:system_defaultWorkingDirectory = "C:\Bupa\Git"
$env:build_artifactStagingDirectory = "C:\Bupa\Git"
# $env:AGENT_workFolder = "C:\Bupa\Git\BupaNodeTasks\BupaVariableReader"
$env:INPUT_fileName = "Apollo\Bupa.Api.BFF.SSP\Bupa.Api.BFF.SSP.CRM.sln"  #'mongodb://$(MongoUser):$(MongoPassword)@digital-dev-mongo1.azureservices.bupa.com.au:27017,digital-dev-mongo2.azureservices.bupa.com.au:27017,digital-dev-mongo3.azureservices.bupa.com.au:27017/'
$env:INPUT_searchdepsjsoninprojects = "true"
$env:INPUT_failifseverityhigher = "CRITICAL"



node app.js

Set-Location -Path $dir