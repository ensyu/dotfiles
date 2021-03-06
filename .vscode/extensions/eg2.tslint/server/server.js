/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';
var server = require('vscode-languageserver');
var settings = null;
var rulesDirectory = null;
var formatterDirectory = null;
var linter = null;
var options = {
    formatter: "json",
    configuration: {},
    rulesDirectory: undefined,
    formattersDirectory: undefined
};
var configCache = {
    filePath: null,
    configuration: null
};
function makeDiagnostic(problem) {
    return {
        severity: server.DiagnosticSeverity.Warning,
        message: problem.failure,
        range: {
            start: {
                line: problem.startPosition.line,
                character: problem.startPosition.character
            },
            end: {
                line: problem.endPosition.line,
                character: problem.endPosition.character
            },
        },
        code: problem.ruleName
    };
}
function getConfiguration(filePath) {
    if (configCache.configuration && configCache.filePath === filePath) {
        return configCache.configuration;
    }
    configCache = {
        filePath: filePath,
        configuration: linter.findConfiguration(null, filePath)
    };
    return configCache.configuration;
}
function flushConfigCache() {
    configCache = {
        filePath: null,
        configuration: null
    };
}
function getErrorMessage(err, document) {
    var result = null;
    if (typeof err.message === 'string' || err.message instanceof String) {
        result = err.message;
    }
    else {
        result = "An unknown error occured while validating file: " + server.Files.uriToFilePath(document.uri);
    }
    return result;
}
function validateAllTextDocuments(connection, documents) {
    var tracker = new server.ErrorMessageTracker();
    documents.forEach(function (document) {
        try {
            validateTextDocument(connection, document);
        }
        catch (err) {
            tracker.add(getErrorMessage(err, document));
        }
    });
    tracker.sendErrors(connection);
}
function validateTextDocument(connection, document) {
    try {
        doValidate(connection, document);
    }
    catch (err) {
        connection.window.showErrorMessage(getErrorMessage(err, document));
    }
}
var connection = server.createConnection(process.stdin, process.stdout);
var documents = new server.TextDocuments();
documents.listen(connection);
connection.onInitialize(function (params) {
    var rootFolder = params.rootPath;
    return server.Files.resolveModule(rootFolder, 'tslint').then(function (value) {
        linter = value;
        var result = { capabilities: { textDocumentSync: documents.syncKind } };
        return result;
    }, function (error) {
        return Promise.reject(new server.ResponseError(99, 'Failed to load tslint library. Please install tslint in your workspace folder using \'npm install tslint\' and then press Retry.', { retry: true }));
    });
});
function doValidate(connection, document) {
    try {
        var uri = document.uri;
        var fsPath = server.Files.uriToFilePath(uri);
        var contents = document.getText();
        options.configuration = getConfiguration(fsPath);
        var ll = new linter(fsPath, contents, options);
        var result = ll.lint();
        var diagnostics = [];
        if (result.failureCount > 0) {
            var problems = JSON.parse(result.output);
            problems.forEach(function (each) {
                diagnostics.push(makeDiagnostic(each));
            });
        }
        connection.sendDiagnostics({ uri: uri, diagnostics: diagnostics });
    }
    catch (err) {
        var message = null;
        if (typeof err.message === 'string' || err.message instanceof String) {
            message = err.message;
            throw new Error(message);
        }
        throw err;
    }
}
// A text document has changed. Validate the document.
documents.onDidChangeContent(function (event) {
    // the contents of a text document has changed
    validateTextDocument(connection, event.document);
});
// The VS Code tslint settings have changed. Revalidate all documents.
connection.onDidChangeConfiguration(function (params) {
    flushConfigCache();
    settings = params.settings;
    if (settings.tslint) {
        rulesDirectory = settings.tslint.rulesDirectory;
        formatterDirectory = settings.tslint.formatterDirectory;
    }
    validateAllTextDocuments(connection, documents.all());
});
// The watched tslint.json has changed. Revalidate all documents.
connection.onDidChangeWatchedFiles(function (params) {
    flushConfigCache();
    validateAllTextDocuments(connection, documents.all());
});
connection.listen();
//# sourceMappingURL=server.js.map