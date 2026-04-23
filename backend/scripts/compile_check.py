import py_compile, os

errs = []
for root, dirs, files in os.walk("app"):
    for f in files:
        if f.endswith(".py"):
            p = os.path.join(root, f)
            try:
                py_compile.compile(p, doraise=True)
            except Exception as e:
                errs.append((p, str(e)))
if errs:
    for p, e in errs:
        print("ERROR in", p, ":", e)
    raise SystemExit(1)
print("All files compile")
