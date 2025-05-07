# Change Log

All notable changes to the "vscode-lsaf-tools" extension will be documented in this file.


##  0.0.1 - 2025-02-20
- Initial release

##  0.0.2 - 2025-02-21
- Fix issue with undefined self

##  0.0.3 - 2025-02-25
- Fix issue with copyToOppositeEndpoint Command that now requires passing additional arguments for better testability

## 0.0.4 - 2025-03-26
- Add Update Credentials command

## 0.0.5 - 2025-04-07
- Fix issue with Self not being defined in dependencies, by using new webpack.DefinePlugin({ 'self': 'globalThis' }).
- Fix bugs introduced in createFormDataFromFileSystem(), getFormData(), getOppositeEndpointUri() during refactoring.
- Display copyToOppositeEndpoint() error messages in VScode UI, if any.

## 0.0.6 - 2025-04-16
- Add "LSAF: Compare To Opposite Endpoint" command
- Remove browser support (prevent ReferenceError: self is not defined)

## 0.0.7 - 2025-04-23
- Implement file and folder contents comparison
- Fix vscode-test configuration and add test runner to run and provide an overview of Jest and VSCode tests and their results
- Add zip file support including streaming
- Add support for opening local and remote files in the most appropriate viewer / editor / desktop application
- fix a few bugs

## 0.0.8 - 2025-04-24
- include current and parent folders in comparison of folder contents list, allowing comparisons between two remote locations without moving to a child folder
- Fix issue with axios-cookiejar-support (new ES module) and identification of folders as existing

## 0.0.9 - 2025-05-07
- Fix issue with logon() function results not being properly awaited
- Add command to customize endpoints in the extension
- assume domain 'ondeman.sas.com' if specified hostname is unqualified
