'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';

import { defaultProjectJson, defaultTasksJson, defaultLaunchJson } from './defaults';

let channel: vscode.OutputChannel;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    channel = vscode.window.createOutputChannel("Peachpie");
    channel.appendLine("Peachpie extension was activated\n");

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let createProjectCommand = vscode.commands.registerCommand('peachpie.createProject', async () => {
        // We will write successes to the output channel. In case of an error, we will display it also
        // in the window and skip the remaining operations.
        channel.show(true);

        // Check the opened folder
        let rootPath = vscode.workspace.rootPath;
        if (rootPath != null) {
            showInfo(`Creating Peachpie project in ${rootPath}\n`);
        } else {
            showError("A folder must be opened in the Explorer panel\n");
            return;
        }

        // Create project.json
        let projectJsonPath = path.join(rootPath, "project.json");
        if (fs.existsSync(projectJsonPath)) {
            showInfo(".NET Core project.json configuration file already exists\n");            
        } else {
            showInfo("Creating .NET Core project.json configuration file...");
            let isProjectJsonSuccess = await createProjectJson(projectJsonPath);
            if (isProjectJsonSuccess) {
                showInfo(".NET Core project.json configuration file was successfully created\n");
            } else {
                showError("Error in creating .NET Core project.json configuration file\n");
                return;
            }
        }

        // Create or update .tasks.json and .launch.json
        showInfo("Configuring build and debugging in .tasks.json and .launch.json...");
        let isTasksSuccess = (await configureTasks()) && (await configureLaunch());
        if (isTasksSuccess) {
            showInfo("Build tasks successfully configured\n");
        } else {
            showError("Error in configuring the build tasks\n");
            return;
        }

        // Run dotnet restore
        let isError = false;
        showInfo("Running dotnet restore to install Peachpie compiler and libraries...");
        await execChildProcess("dotnet restore", rootPath)
        .then((data: string) => {
            showInfo(data);
            if (data.includes("Restore completed in")) {
                showInfo("Project dependencies were successfully installed\n");
            } else {
                showError("Error in installing project dependencies\n");
                isError = true;
            }
        })
        .catch((error) => {
            showError("For building and executing, Peachpie needs .NET Core CLI tools to be available on the path. Make sure they are installed properly.\n");
            isError = true;
        });
        if (isError) {
            return;
        }

        // Activate Omnisharp C# extension for debugging
        let csharpExtension = vscode.extensions.getExtension("ms-vscode.csharp");
        if (csharpExtension == null) {
            showError("Install OmniSharp C# extension in order to enable the debugging of Peachpie projects\n");
            return;            
        } else {
            if (csharpExtension.isActive) {
                showInfo("OmniSharp C# extension is already active\n");
            } else {
                showInfo("Activating OmniSharp C# extension to take care of the project structure and debugging...\n");
                await csharpExtension.activate();
            }
            showInfo("Peachpie project was successfully configured", true);
        }
    });

    context.subscriptions.push(createProjectCommand, channel);
}

function showInfo(message: string, doShowWindow = false) {
    channel.appendLine(message);    
    if (doShowWindow) {
        vscode.window.showInformationMessage(message);
    }
}

function showError(message: string, doShowWindow = true) {
    channel.appendLine(message);
    if (doShowWindow) {
        vscode.window.showErrorMessage(message);
    }
}

// Create project.json file in the opened root folder
async function createProjectJson(filePath: string): Promise<boolean> {
    let projectJsonUri = vscode.Uri.parse(`untitled:${filePath}`);
    let projectJsonDocument = await vscode.workspace.openTextDocument(projectJsonUri);
    let projectJsonContent = JSON.stringify(defaultProjectJson, null, 4);
    let projectJsonEdit = vscode.TextEdit.insert(new vscode.Position(0, 0), projectJsonContent);
    
    let wsEdit = new vscode.WorkspaceEdit();
    wsEdit.set(projectJsonUri, [ projectJsonEdit ]);
    let isSuccess = await vscode.workspace.applyEdit(wsEdit);

    if (isSuccess) {
        isSuccess = await vscode.workspace.saveAll(true);
    }

    return isSuccess;
}

// Overwrite tasks configuration, resulting in adding or replacing .vscode/tasks.json
async function configureTasks(): Promise<boolean> {
    return overwriteConfiguration("tasks", defaultTasksJson);
}

// Overwrite launch configuration, resulting in adding or replacing .vscode/tasks.json
async function configureLaunch(): Promise<boolean> {
    return overwriteConfiguration("launch", defaultLaunchJson);
}

async function overwriteConfiguration(section: string, configuration: any): Promise<boolean> {
    let tasksConfig = vscode.workspace.getConfiguration(section);
    if (tasksConfig == null) {
        channel.appendLine(`Unable to load ${section} configuration`);
        return false;
    }

    try {
        for (var key in configuration) {
            if (configuration.hasOwnProperty(key)) {
                var element = configuration[key];

                // Not defined in the Typescript interface, therefore called this way
                await tasksConfig['update'].call(tasksConfig, key, element);
            }
        }
    } catch (error) {
        channel.appendLine("Error in configuring the build tasks: " + (<Error>error).message);
        return false;
    }

    return true;
}

// Taken from omnisharp-vscode
function execChildProcess(command: string, workingDirectory: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        cp.exec(command, { cwd: workingDirectory, maxBuffer: 500 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }
            else if (stderr && stderr.length > 0) {
                reject(new Error(stderr));
            }
            else {
                resolve(stdout);
            }
        });
    });
}

// this method is called when your extension is deactivated
export function deactivate() {
}