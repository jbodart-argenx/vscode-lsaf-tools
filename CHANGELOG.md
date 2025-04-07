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
