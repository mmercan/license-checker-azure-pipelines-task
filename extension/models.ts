
export interface IglobalPackageList {
    [index: string]: IPackage
}


export interface IProjectReport {
    [index: string]: IPackages

}

export interface IPackages {
    packages: IglobalPackageList
}


export interface IPackage {
    coordinates?: string;
    version?: string;
    name?: string;
    license: ILicense;
}
export interface ILicense {
    licenseType?: string;
    licenseUrl?: string;
    found?: boolean;
}

