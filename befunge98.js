/*var log = console.log;
console.log = function() {
    log.apply(console, Array.from(arguments).map(e => typeof e === "string" ? e : JSON.stringify(e)))
};*/

var examples = [
    { name: "Hello World!", code: '"!dlrow olleH">:#,_@' },
    { name: "Quine", code: ":0g,:93+`#@_1+" }
];
window.addEventListener("load", function() {
    var removeAllChildren = function(element) {
        while (element.firstChild)
            element.removeChild(element.firstChild);
    };
    var setTextContent = function(element, content) {
        removeAllChildren(element);
        element.appendChild(document.createTextNode(content));
    };
    var exampleSelect = document.querySelector("#examples");
    for (var i = 0; i < examples.length; i++) {
        var option = document.createElement("option");
        setTextContent(option, examples[i].name);
        exampleSelect.appendChild(option);
    }
    exampleSelect.addEventListener("change", function() {
        if (exampleSelect.selectedIndex > 0) {
            var code = document.querySelector("#code").value = examples[exampleSelect.selectedIndex - 1].code;
            storeStringValue("code", code);
            exampleSelect.selectedIndex = 0;
        }
    });
    exampleSelect.selectedIndex = 0;
    var storeStringValue = function(name, value) {
        localStorage.setItem("jsfunge98_" + name, btoa(value));
    };
    var fileChooser = document.querySelector("#file");
    document.querySelector("#open-file").addEventListener("click", function() {
        fileChooser.click();
    });
    fileChooser.addEventListener("change", function() {
        var file = fileChooser.files[0];
        if (!file)
            return;
        var reader = new FileReader();
        reader.addEventListener("load", function() {
            var code = document.querySelector("#code").value = reader.result.replace(/\r\n?/g, "\n");
            storeStringValue("code", code);
            filename = file.name;
            if (engine !== null)
                engine.filename = filename;
        });
        reader.readAsText(file, "ISO-8859-1");
    });
    var codingArea = document.querySelector("#coding"),
        executionArea = document.querySelector("#execution"), 
        aboutBox = document.querySelector("#about");
    var actualHide = function(e) {
        if (window.getComputedStyle(e.target).opacity === "0")
            e.target.style.display = "none";
    };
    var showFix = function(element) {
        element.style.display = "block";
        setTimeout(function() {
            element.style.opacity = 1;
        }, 20);
    };
    codingArea.addEventListener("transitionend", actualHide);
    executionArea.addEventListener("transitionend", actualHide);
    aboutBox.addEventListener("transitionend", actualHide);
    var filename = "online.b98", engine = null, delay = false, delayMs = 500, interactive = true,
        debug = false, extraArgs = false, output = "", inputFocusInterval = 0,
        spaceHeight = 300, spaceX = 0, spaceY = 0, activeCell, manualPos = false;
    var setupEngine = function() {
        var code = document.querySelector("#code").value;
        var input = document.querySelector("#input").value;
        document.querySelector("#run").style.display = "inline-block";
        document.querySelector("#step").style.display = "inline-block";
        document.querySelector("#pause").style.display = "none";
        engine = new BefungeEngine(code, interactive ? null : input);
        engine.delayOn = delay;
        engine.delay = delayMs;
        engine.filename = filename;
        var extraArgList = document.querySelector("#args").value;
        engine.extraArguments = extraArgList.length === 0 ? [] : extraArgList.split("\n");
        engine.outputCallback = function(text) {
            output += text;
            setTextContent(document.querySelector("#output"), output);
        };
        engine.updateCallback = function() {
            if (engine.keepRunning) {
                document.querySelector("#run").style.display = "none";
                document.querySelector("#step").style.display = "none";
                document.querySelector("#pause").style.display = "inline-block";
            } else {
                document.querySelector("#run").style.display = "inline-block";
                document.querySelector("#step").style.display = "inline-block";
                document.querySelector("#pause").style.display = "none";
            }
            var exitCode = document.querySelector("#exit-code");
            if (engine.finished) {
                setTextContent(exitCode, "\nExited with status " + engine.exitCode);
                exitCode.style.display = "inline";
            } else {
                exitCode.style.display = "none";
            }
            document.querySelector("#console").scrollTop = document.querySelector("#console").scrollHeight;
            if (debug) {
                updateStack();
                updateFungeSpace();
            }
        };
        engine.fungeSpace.modified = true;
        if (debug) {
            updateStack();
            updateFungeSpace();
        }
    };
    var updateStack = function() {
        var stackRoot = document.querySelector("#stack");
        removeAllChildren(stackRoot);
        for (var i = 0; i < engine.stackStack.data.length; i++) {
            var stackElem = document.createElement("div");
            stackElem.classList.add("stack");
            if (engine.stackStack.data[i].length == 0) {
                var itemElem = document.createElement("div");
                itemElem.classList.add("stack-empty");
                setTextContent(itemElem, "(empty)");
                stackElem.appendChild(itemElem);
            }
            for (var j = 0; j < engine.stackStack.data[i].length; j++) {
                var itemElem = document.createElement("div");
                itemElem.classList.add("stack-item");
                setTextContent(itemElem, engine.stackStack.data[i][j].toString());
                stackElem.appendChild(itemElem);
            }
            stackRoot.appendChild(stackElem);
            stackElem.scrollLeft = stackElem.scrollWidth;
        }
    };
    var updateFungeSpace = function() {
        var spaceRoot = document.querySelector("#funge-space");
        activeCell = null;
        if (engine.fungeSpace.modified) {
            // TODO implement a performance-friendly version, using canvas or something
            removeAllChildren(spaceRoot);
            var minX = engine.fungeSpace.minX, minY = engine.fungeSpace.minY,
                maxX = engine.fungeSpace.maxX, maxY = engine.fungeSpace.maxY,
                ipX = engine.ip.x, ipY = engine.ip.y;
            var rows = [];
            for (var y = minY; y <= maxY; y++) {
                var row = document.createElement("tr");
                for (var x = minX; x <= maxX; x++) {
                    var cell = document.createElement("td");
                    cell.setAttribute("id", "cell-" + x + "-" + y);
                    if (x === ipX && y === ipY) {
                        cell.classList.add("active");
                        activeCell = cell;
                    }
                    var char = engine.fungeSpace.get(new Vec2(x, y));
                    char = Util.isPrintable(char) ? String.fromCharCode(char) : char;
                    setTextContent(cell, char);
                    row.appendChild(cell);
                }
                rows.push(row);
            }
            for (var row of rows)
                spaceRoot.appendChild(row);
            engine.fungeSpace.modified = false;
        } else {
            [].slice.call(document.querySelectorAll("#funge-space td.active")).forEach(function(e) {
                e.classList.remove("active");
            });
            activeCell = document.querySelector("#cell-" + engine.ip.x + "-" + engine.ip.y);
            if (activeCell)
                activeCell.classList.add("active");
        }
        repositionFungeSpace();
    };
    var repositionFungeSpace = function() {
        var spaceRoot = document.querySelector("#funge-space");
        if (!manualPos && activeCell) {
            var spaceContainer = document.querySelector("#funge-space-container");
            spaceX = (spaceContainer.offsetWidth - activeCell.offsetWidth) / 2 - activeCell.offsetLeft;
            spaceY = (spaceContainer.offsetHeight - activeCell.offsetHeight) / 2 - activeCell.offsetTop;
        }
        spaceRoot.style.left = spaceX + "px";
        spaceRoot.style.top = spaceY + "px";
    }
    var clearExecution = function() {
        engine.stop();
        engine.outputCallback = function(text) {};
        output = "";
        removeAllChildren(document.querySelector("#output"));
        removeAllChildren(document.querySelector("#stack"));
        removeAllChildren(document.querySelector("#exit-code"));
    };
    var updateInteractiveArea = function() {
        var checkIcon = document.querySelector("#interactive span");
        var inputArea = document.querySelector("#input-area");
        var interactiveInputArea = document.querySelector("#interactive-input");
        if (interactive) {
            checkIcon.classList.remove("fa-square");
            checkIcon.classList.add("fa-check-square");
            inputArea.style.display = "none";
            interactiveInputArea.style.display = "inline";
        } else {
            checkIcon.classList.remove("fa-check-square");
            checkIcon.classList.add("fa-square");
            inputArea.style.display = "block";
            interactiveInputArea.style.display = "none";
        }
    };
    var updateArgumentsArea = function() {
        var checkIcon = document.querySelector("#extra-args span");
        var argsArea = document.querySelector("#args-area");
        if (extraArgs) {
            checkIcon.classList.remove("fa-square");
            checkIcon.classList.add("fa-check-square");
            argsArea.style.display = "block";
        } else {
            checkIcon.classList.remove("fa-check-square");
            checkIcon.classList.add("fa-square");
            argsArea.style.display = "none";
        }
    };
    var updateDelayButton = function() {
        var checkIcon = document.querySelector("#delay span");
        if (delay) {
            checkIcon.classList.remove("fa-square");
            checkIcon.classList.add("fa-check-square");
            delayAmount.parentNode.style.width = "8ch";
            delayAmount.parentNode.style.marginRight = "5px";
        } else {
            checkIcon.classList.remove("fa-check-square");
            checkIcon.classList.add("fa-square");
            delayAmount.parentNode.style.width = "0";
            delayAmount.parentNode.style.marginRight = "0";
        }
    };
    var updateDebugParts = function() {
        var checkIcon = document.querySelector("#debug span");
        var debugContainer = document.querySelector("#debug-container");
        if (debug) {
            checkIcon.classList.remove("fa-square");
            checkIcon.classList.add("fa-check-square");
            debugContainer.style.display = "block";
            if (!engine || engine.keepRunning) {
                removeAllChildren(document.querySelector("#stack"));
                removeAllChildren(document.querySelector("#funge-space"));
            } else {
                updateStack();
                updateFungeSpace();
            }
        } else {
            checkIcon.classList.remove("fa-check-square");
            checkIcon.classList.add("fa-square");
            debugContainer.style.display = "none";
        }
    };
    var resizeFungeSpace = function() {
        document.querySelector("#funge-space-container").style.height = spaceHeight + "px";
        repositionFungeSpace();
    };
    document.querySelector("#delay-ms").addEventListener("change", function () {
        var newDelay = parseInt(document.querySelector("#delay-ms").value);
        if (!isNaN(newDelay) && newDelay > 0)
            delayMs = newDelay;
        localStorage.setItem("jsfunge98_debugdelay", delayMs.toString());
        if (engine !== null)
            engine.delay = newDelay;
    });
    [].slice.call(document.querySelectorAll("#code, #input, #args")).forEach(function(e) {
        e.addEventListener("change", function(e) {
            storeStringValue(e.target.id, e.target.value);
        });
    });
    document.querySelector("#clear").addEventListener("click", function() {
        document.querySelector("#code").value = "";
        document.querySelector("#input").value = "";
        document.querySelector("#args").value = "";
    });
    document.querySelector("#show-about").addEventListener("click", function() {
        showFix(aboutBox);
    });
    aboutBox.addEventListener("click", function(e) {
        if (e.target.nodeName !== "A")
            aboutBox.style.opacity = 0;
    });
    document.querySelector("#go").addEventListener("click", function() {
        showFix(executionArea);
        executionArea.style.zIndex = 2;
        codingArea.style.opacity = 0;
        codingArea.style.zIndex = 1;
        setupEngine();
        inputFocusInterval = setInterval(function() {
            if (interactive) {
                document.querySelector("#interactive-input").focus();
            }
        }, 100);
    });
    document.querySelector("#back").addEventListener("click", function() {
        clearExecution();
        if (inputFocusInterval !== 0)
            clearInterval(inputFocusInterval);
        executionArea.style.opacity = 0;
        executionArea.style.zIndex = 1;
        showFix(codingArea);
        codingArea.style.zIndex = 2;
    });
    var delayAmount = document.querySelector("#delay-ms");
    document.querySelector("#delay").addEventListener("click", function() {
        delay = !delay;
        localStorage.setItem("jsfunge98_debugdelayon", delay.toString());
        updateDelayButton();
        if (engine !== null)
            engine.delayOn = delay;
    });
    document.querySelector("#debug").addEventListener("click", function() {
        debug = !debug;
        localStorage.setItem("jsfunge98_debug", debug.toString());
        updateDebugParts();
    });
    document.querySelector("#interactive").addEventListener("click", function() {
        interactive = !interactive;
        localStorage.setItem("jsfunge98_interactive", interactive.toString());
        updateInteractiveArea();
    });
    document.querySelector("#extra-args").addEventListener("click", function() {
        extraArgs = !extraArgs;
        localStorage.setItem("jsfunge98_extraargs", extraArgs.toString());
        if (!extraArgs)
            localStorage.removeItem("jsfunge98_args");
        else
            storeStringValue("args", document.querySelector("#args").value);
        updateArgumentsArea();
    });
    document.querySelector("#reset").addEventListener("click", function() {
        clearExecution();
        setupEngine();
    });
    document.querySelector("#run").addEventListener("click", function() {
        if (engine.finished) {
            clearExecution();
            setupEngine();
        }
        document.querySelector("#run").style.display = "none";
        document.querySelector("#step").style.display = "none";
        document.querySelector("#pause").style.display = "inline-block";
        engine.run();
    });
    document.querySelector("#pause").addEventListener("click", function() {
        document.querySelector("#pause").style.display = "none";
        document.querySelector("#run").style.display = "inline-block";
        document.querySelector("#step").style.display = "inline-block";
        engine.stop();
    });
    document.querySelector("#step").addEventListener("click", function() {
        if (engine.finished) {
            clearExecution();
            setupEngine();
        }
        engine.step();
    });
    var resizingFungeSpace = false, movingFungeSpace = false, dragStartX, dragStartY, dragStartXVal, dragStartYVal;
    window.addEventListener("mousemove", function(e) {
        if (resizingFungeSpace) {
            spaceHeight = Math.max(100, dragStartYVal + e.clientY - dragStartY);
            resizeFungeSpace();
        } else if (movingFungeSpace) {
            spaceX = dragStartXVal + e.clientX - dragStartX;
            spaceY = dragStartYVal + e.clientY - dragStartY;
            manualPos = true;
            repositionFungeSpace();
        }
    });
    window.addEventListener("mouseup", function() {
        resizingFungeSpace = movingFungeSpace = false;
        document.body.classList.remove("resizing", "moving", "noselect");
        localStorage.setItem("jsfunge98_fungespaceheight", spaceHeight.toString());
    });
    document.querySelector("#funge-space-resize").addEventListener("mousedown", function(e) {
        dragStartY = e.clientY;
        dragStartYVal = spaceHeight;
        resizingFungeSpace = true;
        document.body.classList.add("resizing", "noselect");
        e.stopPropagation();
    });
    document.querySelector("#funge-space-container").addEventListener("mousedown", function(e) {
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragStartXVal = spaceX;
        dragStartYVal = spaceY;
        movingFungeSpace = true;
        document.body.classList.add("moving", "noselect");
    });
    window.addEventListener("resize", repositionFungeSpace);
    var storedCode = localStorage.getItem("jsfunge98_code");
    if (storedCode !== null)
        document.querySelector("#code").value = atob(storedCode);
    var storedInput = localStorage.getItem("jsfunge98_input");
    if (storedInput !== null)
        document.querySelector("#input").value = atob(storedInput);
    var storedArgs = localStorage.getItem("jsfunge98_args");
    if (storedArgs !== null)
        document.querySelector("#args").value = atob(storedArgs);
    var storedDelay = parseInt(localStorage.getItem("jsfunge98_debugdelay"));;
    if (storedDelay !== null && !isNaN(storedDelay))
        delayMs = storedDelay;
    document.querySelector("#delay-ms").value = delayMs;
    delay = localStorage.getItem("jsfunge98_debugdelayon") === "true";
    updateDelayButton();
    interactive = localStorage.getItem("jsfunge98_interactive") !== "false";
    updateInteractiveArea();
    extraArgs = localStorage.getItem("jsfunge98_extraargs") === "true";
    updateArgumentsArea();
    debug = localStorage.getItem("jsfunge98_debug") === "true";
    updateDebugParts();
    spaceHeight = parseInt(localStorage.getItem("jsfunge98_fungespaceheight") || "300");
    resizeFungeSpace();
});
