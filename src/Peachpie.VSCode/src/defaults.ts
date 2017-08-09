'use strict';

export var defaultTasksJson =
{
    "version": "0.1.0",
    "command": "dotnet",
    "isShellCommand": true,
    "args": [],
    "tasks": [
        {
            "taskName": "build",
            "args": [
                "${workspaceRoot}"
            ],
            "isBuildCommand": true,
            "problemMatcher": "$msCompile"
        }
    ]
};

export var defaultLaunchJson =
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": ".NET Core Launch (console)",
      "type": "coreclr",
      "request": "launch",
      "preLaunchTask": "build",
      "program": "${workspaceRoot}/bin/Debug/netcoreapp1.1/project.dll",
      "args": [],
      "cwd": "${workspaceRoot}",
      "externalConsole": false,
      "stopAtEntry": false,
      "internalConsoleOptions": "openOnSessionStart"
    },
    {
      "name": ".NET Core Attach",
      "type": "coreclr",
      "request": "attach",
      "processId": "${command.pickProcess}"
    }
  ]
};