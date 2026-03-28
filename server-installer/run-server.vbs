Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

base = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = base

exe = """" & base & "\attendease-server.exe" & """"
cfg = """" & base & "\config.env" & """"

shell.Run exe & " --config " & cfg, 0
