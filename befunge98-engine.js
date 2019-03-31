var Util = {};
Util.stringifyFingerprint = function(fingerprint) {
    var string = "";
    while (fingerprint > 0) {
        string = String.fromCharCode(fingerprint & 0xFF) + string;
        fingerprint >>= 8;
    }
    return string;
};
Util.isPrintable = function(character) {
    if (typeof character === "string")
        return character.charCodeAt() >= 32 && character.charCodeAt() <= 126;
    else
        return character >= 32 && character <= 126;
};
Util.isUnicode = function(value) {
    return value >= 0 && value <= 0x1FFFFF;
};
Util.filledArray = function(length, value) {
    var arr = new Array(length);
    for (var i = 0; i < length; i++)
        arr[i] = value;
    return arr;
};
Util.expandArray = function(array, max, fill) {
    for (var i = array.length; i <= max; i++)
        array[i] = fill;
    return array;
};
Util.expand2DArray = function(array, maxX, maxY, fill) {
    for (var i = 0; i < array.length; i++)
        Util.expandArray(array[i], maxX, fill);
    for (i = array.length; i <= maxY; i++)
        array[i] = Util.filledArray(maxX + 1, fill);
    return array;
};

var Vec2 = function(x, y) {
    if (typeof x === "object") {
        this.x = x.x || 0;
        this.y = x.y || 0;
    } else {
        this.x = x || 0;
        this.y = y || 0;
    }
};
Vec2.prototype.add = function(v) {
    return new Vec2(this.x + v.x, this.y + v.y);
};
Vec2.prototype.subtract = function(v) {
    return new Vec2(this.x - v.x, this.y - v.y);
};
Vec2.prototype.multiply = function(r) {
    return new Vec2(this.x * r, this.y * r);
};
Vec2.prototype.negate = function() {
    return new Vec2(-this.x, -this.y);
};
Vec2.prototype.rotateCW = function() {
    return new Vec2(-this.y, this.x);
};
Vec2.prototype.rotateCCW = function() {
    return new Vec2(this.y, -this.x);
};
Vec2.prototype.equals = function(o) {
    return this.x === o.x && this.y === o.y;
};

var StackStack = function() {
    this.data = [[]];
};
StackStack.popValue = function(stack) {
    if (stack.length === 0)
        return 0;
    return stack.pop();
};
StackStack.prototype.toss = function() {
    return this.data[this.data.length - 1];
};
StackStack.prototype.soss = function() {
    if (this.data.length < 2)
        return null;
    else
        return this.data[this.data.length - 2];
};
StackStack.prototype.push = function(item) {
    this.toss().push(item);
};
StackStack.prototype.pop = function() {
    return StackStack.popValue(this.toss());
};
StackStack.prototype.pushVec2 = function(vec, stack) {
    stack = stack || this.toss();
    stack.push(vec.x);
    stack.push(vec.y);
};
StackStack.prototype.popVec2 = function(stack) {
    stack = stack || this.toss();
    var y = StackStack.popValue(stack);
    var x = StackStack.popValue(stack);
    return new Vec2(x, y);
};
StackStack.prototype.clear = function(amount) {
    this.toss().splice(-(amount || 0));
};
StackStack.prototype.beginBlock = function(n, offset) {
    if (n > 0) {
        if (n <= this.toss().length)
            this.data.push(this.toss().splice(-n));
        else
            this.data.push(Util.filledArray(n - this.toss().length, 0).concat(this.toss().splice(0)));
    } else {
        if (n < 0)
            Array.prototype.splice.apply(this.toss(), [this.toss().length, 0].concat(Util.filledArray(-n, 0)));
        this.data.push([]);
    }
    this.pushVec2(offset, this.soss());
};
StackStack.prototype.endBlock = function(n) {
    var offset = this.popVec2(this.soss());
    if (n > 0)
        Array.prototype.splice.apply(this.soss(), [this.soss().length, 0].concat(this.toss().splice(-n)));
    else if (n < 0)
        this.soss().splice(n);
    this.data.pop();
    return offset;
};
StackStack.prototype.stackUnderStack = function(n) {
    var pushTo, popFrom;
    if (n >= 0) {
        pushTo = this.toss();
        popFrom = this.soss();
    } else {
        pushTo = this.soss();
        popFrom = this.toss();
        n = -n;
    }
    for (var i = 0; i < n; i++) {
        pushTo.push(StackStack.popValue(popFrom));
    }
};

var FungeSpace = function(code) {
    var lines = code.split("\n").map(function(line) {
        return [].slice.call(line).map(function(character) {
            return character.charCodeAt();
        });
    });
    var maxlen = 0;
    for (var i = 0; i < lines.length; i++) {
        maxlen = Math.max(maxlen, lines[i].length);
    }
    this.minX = 0;
    this.minY = 0;
    this.maxX = maxlen - 1;
    this.maxY = lines.length - 1;
    this.posXposY = lines;
    this.posXnegY = [[]];
    this.negXposY = [[]];
    this.negXnegY = [[]];
    this.modified = false;
    this.doExpansion();
};
FungeSpace.prototype.doExpansion = function() {
    Util.expand2DArray(this.posXposY, this.maxX, this.maxY, 32);
    Util.expand2DArray(this.posXnegY, this.maxX, ~this.minY, 32);
    Util.expand2DArray(this.negXposY, ~this.minX, this.maxY, 32);
    Util.expand2DArray(this.negXnegY, ~this.minX, ~this.minY, 32);
};
FungeSpace.prototype.get = function(pos) {
    if (!this.isAddressable(pos))
        return 32;
    else if (pos.x >= 0)
        if (pos.y >= 0)
            return this.posXposY[pos.y][pos.x];
        else
            return this.posXnegY[~pos.y][pos.x];
    else if (pos.y >= 0)
        return this.negXposY[pos.y][~pos.x];
    else
        return this.negXnegY[~pos.y][~pos.x];
};
FungeSpace.prototype.set = function(pos, value) {
    if (pos.x >= 0)
        if (pos.y >= 0)
            this.posXposY[pos.y][pos.x] = value;
        else
            this.posXnegY[~pos.y][pos.x] = value;
    else if (pos.y >= 0)
        this.negXposY[pos.y][~pos.x] = value;
    else
        this.negXnegY[~pos.y][~pos.x] = value;
};
FungeSpace.prototype.put = function(pos, value) {
    if (this.isAddressable(pos)) {
        this.set(pos, value);
        if (value === 32) {
            var shrunk;
            if (pos.x === this.minX) {
                shrunk = pos.x;
                while (this.isColumnEmpty(shrunk))
                    shrunk++;
                this.minX = shrunk;
            }
            if (pos.x === this.maxX) {
                shrunk = pos.x;
                while (this.isColumnEmpty(shrunk))
                    shrunk--;
                this.maxX = shrunk;
            }
            if (pos.y === this.minY) {
                shrunk = pos.y;
                while (this.isLineEmpty(shrunk))
                    shrunk++;
                this.minY = shrunk;
            }
            if (pos.y === this.maxY) {
                shrunk = pos.y;
                while (this.isLineEmpty(shrunk))
                    shrunk--;
                this.maxY = shrunk;
            }
        }
    } else if (value !== 32) {
        this.minX = Math.min(this.minX, pos.x);
        this.minY = Math.min(this.minY, pos.y);
        this.maxX = Math.max(this.maxX, pos.x);
        this.maxY = Math.max(this.maxY, pos.y);
        this.doExpansion();
        this.set(pos, value);
    }
    this.modified = true;
};
FungeSpace.prototype.isAddressable = function(ip) {
    return ip.x >= this.minX && ip.x <= this.maxX && ip.y >= this.minY && ip.y <= this.maxY;
};
FungeSpace.prototype.isLineEmpty = function(y) {
    for (var x = this.minX; x <= this.maxX; x++)
        if (this.get(new Vec2(x, y)) !== 32)
            return false;
    return true;
};
FungeSpace.prototype.isColumnEmpty = function(x) {
    for (var y = this.minY; y <= this.maxY; y++)
        if (this.get(new Vec2(x, y)) !== 32)
            return false;
    return true;
};

var BefungeEngine = function(code, input) {
    this.fungeSpace = new FungeSpace(code.replace(/\f/g, ""));
    this.interactive = input === null;
    this.inputQueue = [];
    if (input !== null)
        this.addInput(input);
    this.stackStack = new StackStack();
    this.ip = new Vec2(0, 0);
    this.delta = new Vec2(1, 0);
    this.stringMode = false;
    this.waitingForInput = false;
    this.offset = new Vec2(0, 0);
    this.stepCount = 0;
    this.runTimeout = -1;
    this.finished = false;
    this.exitCode = 0;
    this.keepRunning = false;
    this.previousInstruction = -1;
    this.filename = "online.b98";
    this.extraArguments = [];
    this.loadedFingerprints = [];
    this.fingerprintCommands = {};
    for (var i = 65; i <= 90; i++)
        this.fingerprintCommands[i] = [];
    
    this.updateCallback = function() {};
    this.outputCallback = function(text) {};
    this.delay = 500;
    this.delayOn = false;
};

BefungeEngine.RUN_BLOCK_SIZE = 1000;

BefungeEngine.prototype.moveIP = function() {
    this.ip = this.ip.add(this.delta);
};
BefungeEngine.prototype.stepIP = function() {
    var currInstruction, prevInstruction;
    do {
        var prevPosition = this.ip;
        this.moveIP();
        if (!this.fungeSpace.isAddressable(this.ip)) {
            var ip = this.ip;
            do {
                if ((ip.x > this.fungeSpace.maxX && this.delta.x <= 0) ||
                    (ip.x < this.fungeSpace.minX && this.delta.x >= 0) ||
                    (ip.y > this.fungeSpace.maxY && this.delta.y <= 0) ||
                    (ip.y < this.fungeSpace.minY && this.delta.y >= 0))
                    throw new Error("IP can't get back in bounds");
                ip = ip.subtract(this.delta);
            } while (!this.fungeSpace.isAddressable(ip));
            do {
                ip = ip.subtract(this.delta);
            } while (this.fungeSpace.isAddressable(ip));
            this.ip = ip.add(this.delta);
        }
        prevInstruction = this.previousInstruction;
        currInstruction = this.fungeSpace.get(this.ip);
        this.previousInstruction = currInstruction;
        if (this.ip.equals(prevPosition))
            throw new Error("IP stuck at " + this.ip.x + "," + this.ip.y);
    } while (currInstruction === 32 && prevInstruction === 32);
};
BefungeEngine.prototype.reverseDelta = function() {
    this.delta = this.delta.negate();
};
BefungeEngine.prototype.addInput = function(input) {
    for (var i = 0; i < input.length; i++)
        this.inputQueue.push(input[i]);
    if (input.length !== 0 && this.waitingForInput) {
        this.waitingForInput = false;
        var read = this[this.inputWaitType]();
        this.inputCallback(read);
        if (!this.waitingForInput)
            this.run(true);
    }
};
BefungeEngine.prototype.peekInput = function() {
    if (this.inputQueue.length === 0) {
        if (this.interactive) {
            this.waitingForInput = true;
            this.inputWaitType = "peekInput";
            throw "wait for input";
        } else
            return null;
    }
    return this.inputQueue[0];
};
BefungeEngine.prototype.nextInput = function() {
    if (this.inputQueue.length === 0) {
        if (this.interactive) {
            this.waitingForInput = true;
            this.inputWaitType = "nextInput";
            throw "wait for input";
        } else
            return null;
    }
    return this.inputQueue.shift();
};
BefungeEngine.prototype.step = function() {
    if (this.finished)
        return;
    try {
        var instruction = this.fungeSpace.get(this.ip);
        if (this.stringMode) {
            if (instruction === 34)
                this.stringMode = !this.stringMode;
            else
                this.stackStack.push(instruction);
        } else {
            if (!this.interpretInstruction(instruction))
                return;
        }
        if (!this.finished) {
            this.stepIP();
            this.stepCount++;
        }
        if (!this.keepRunning || this.delayOn)
            this.updateCallback();
    } catch (e) {
        alert("Error: " + e.message);
        console.error(e);
        this.exitCode = 1;
        this.finished = true;
        this.keepRunning = false;
    }
};
BefungeEngine.prototype.interpretInstruction = function(instruction) {
    var a, b, c, i, j;
    switch (instruction) {
    case 32: /* space */
        break;
    case 33: /* ! */
        a = this.stackStack.pop();
        this.stackStack.push(a === 0 ? 1 : 0);
        break;
    case 34: /* " */
        this.stringMode = !this.stringMode;
        break;
    case 35: /* # */
        this.moveIP();
        break;
    case 36: /* $ */
        this.stackStack.pop();
        break;
    case 37: /* % */
        b = this.stackStack.pop();
        a = this.stackStack.pop();
        this.stackStack.push(b !== 0 ? a % b : 0);
        break;
    case 38: /* & */
        var read = "", character;
        try {
            character = this.peekInput();
            while (!/[0-9]/.test(character) && character !== null) {
                character = this.nextInput();
            }
            if (character === null) {
                this.reverseDelta();
            } else {
                while (/[0-9]/.test(character)) {
                    read += character;
                    character = this.nextInput();
                }
            }
        } catch (e) {
            return false;
        }
        break;
    case 39: /* ' */
        this.moveIP();
        this.stackStack.push(this.fungeSpace.get(this.ip));
        break;
    case 40: /* ( */
        a = this.stackStack.pop();
        b = 0;
        for (i = 0; i < a; i++)
            b = (b << 8) + this.stackStack.pop();
        if (b in BefungeEngine.fingerprints) {
            this.loadedFingerprints.push(b);
            for (i in BefungeEngine.fingerprints[b]) {
                if (BefungeEngine.fingerprints[b].hasOwnProperty(i)) {
                    this.fingerprintCommands[i.charCodeAt()].push(BefungeEngine.fingerprints[b][i]);
                }
            }
            this.stackStack.push(b);
            this.stackStack.push(1);
        } else {
            this.reverseDelta();
        }
        break;
    case 41: /* ) */
        a = this.stackStack.pop();
        b = 0;
        for (i = 0; i < a; i++)
            b = (b << 8) + this.stackStack.pop();
        a = this.loadedFingerprints.lastIndexOf(b);
        if (~a) {
            this.loadedFingerprints.splice(a, 1);
            for (i in BefungeEngine.fingerprints[b]) {
                if (BefungeEngine.fingerprints[b].hasOwnProperty(i)) {
                    this.fingerprintCommands[i.charCodeAt()].pop();
                }
            }
        } else {
            this.reverseDelta();
        }
        break;
    case 42: /* * */
        b = this.stackStack.pop();
        a = this.stackStack.pop();
        this.stackStack.push(a * b);
        break;
    case 43: /* + */
        b = this.stackStack.pop();
        a = this.stackStack.pop();
        this.stackStack.push(a + b);
        break;
    case 44: /* , */
        a = this.stackStack.pop();
        this.outputCallback(Util.isUnicode(a) ? String.fromCharCode(a) : "");
        break;
    case 45: /* - */
        b = this.stackStack.pop();
        a = this.stackStack.pop();
        this.stackStack.push(a - b);
        break;
    case 46: /* . */
        a = this.stackStack.pop();
        this.outputCallback(a + " ");
        break;
    case 47: /* / */
        b = this.stackStack.pop();
        a = this.stackStack.pop();
        this.stackStack.push(b !== 0 ? Math.floor(a / b) : 0);
        break;
    case 48: /* 0 */
        this.stackStack.push(0);
        break;
    case 49: /* 1 */
        this.stackStack.push(1);
        break;
    case 50: /* 2 */
        this.stackStack.push(2);
        break;
    case 51: /* 3 */
        this.stackStack.push(3);
        break;
    case 52: /* 4 */
        this.stackStack.push(4);
        break;
    case 53: /* 5 */
        this.stackStack.push(5);
        break;
    case 54: /* 6 */
        this.stackStack.push(6);
        break;
    case 55: /* 7 */
        this.stackStack.push(7);
        break;
    case 56: /* 8 */
        this.stackStack.push(8);
        break;
    case 57: /* 9 */
        this.stackStack.push(9);
        break;
    case 58: /* : */
        a = this.stackStack.pop();
        this.stackStack.push(a);
        this.stackStack.push(a);
        break;
    case 59: /* ; */
        do
            this.stepIP();
        while (this.fungeSpace.get(this.ip) !== 59);
        break;
    case 60: /* < */
        this.delta = new Vec2(-1, 0);
        break;
    case 61: /* = */
        this.reverseDelta();
        break;
    case 62: /* > */
        this.delta = new Vec2(1, 0);
        break;
    case 63: /* ? */
        this.delta = [new Vec2(1, 0), new Vec2(0, 1), new Vec2(-1, 0), new Vec2(0, -1)][Math.floor(Math.random() * 4)];
        break;
    case 64: /* @ */
        this.exitCode = 0;
        this.finished = true;
        this.keepRunning = false;
        break;
    case 65: /* A */
    case 66: /* B */
    case 67: /* C */
    case 68: /* D */
    case 69: /* E */
    case 70: /* F */
    case 71: /* G */
    case 72: /* H */
    case 73: /* I */
    case 74: /* J */
    case 75: /* K */
    case 76: /* L */
    case 77: /* M */
    case 78: /* N */
    case 79: /* O */
    case 80: /* P */
    case 81: /* Q */
    case 82: /* R */
    case 83: /* S */
    case 84: /* T */
    case 85: /* U */
    case 86: /* V */
    case 87: /* W */
    case 88: /* X */
    case 89: /* Y */
    case 90: /* Z */
        a = this.fingerprintCommands[instruction];
        if (a.length !== 0)
            a[a.length - 1](this);
        else
            this.reverseDelta();
        break;
    case 91: /* [ */
        this.delta = this.delta.rotateCCW();
        break;
    case 92: /* \ */
        b = this.stackStack.pop();
        a = this.stackStack.pop();
        this.stackStack.push(b);
        this.stackStack.push(a);
        break;
    case 93: /* ] */
        this.delta = this.delta.rotateCW();
        break;
    case 94: /* ^ */
        this.delta = new Vec2(0, -1);
        break;
    case 95: /* _ */
        a = this.stackStack.pop();
        if (a === 0)
            this.delta = new Vec2(1, 0);
        else
            this.delta = new Vec2(-1, 0);
        break;
    case 96: /* ` */
        b = this.stackStack.pop();
        a = this.stackStack.pop();
        this.stackStack.push(a > b ? 1 : 0);
        break;
    case 97: /* a */
        this.stackStack.push(10);
        break;
    case 98: /* b */
        this.stackStack.push(11);
        break;
    case 99: /* c */
        this.stackStack.push(12);
        break;
    case 100: /* d */
        this.stackStack.push(13);
        break;
    case 101: /* e */
        this.stackStack.push(14);
        break;
    case 102: /* f */
        this.stackStack.push(15);
        break;
    case 103: /* g */
        this.stackStack.push(this.fungeSpace.get(this.stackStack.popVec2().add(this.offset)));
        break;
    /* case 104: */ /* h */
    case 105: /* i */
        this.reverseDelta();
        break;
    case 106: /* j */
        a = this.stackStack.pop();
        b = a < 0 ? this.delta.negate() : this.delta;
        c = a < 0 ? -a : a;
        for (i = 0; i < c; i++)
            this.ip = this.ip.add(b);
        break;
    case 107: /* k */
        var position = this.ip;
        a = this.stackStack.pop();
        do {
            this.stepIP();
            b = this.fungeSpace.get(this.ip);
        } while (b === 32 || b === 59);
        this.ip = position;
        for (i = 0; i < a; i++)
            this.interpretInstruction(b);
        if (a === 0)
            this.stepIP();
        break;
    /* case 108: */ /* l */
    /* case 109: */ /* m */
    case 110: /* n */
        this.stackStack.clear();
        break;
    case 111: /* o */
        this.reverseDelta();
        break;
    case 112: /* p */
        a = this.stackStack.popVec2();
        b = this.stackStack.pop();
        this.fungeSpace.put(a.add(this.offset), b);
        break;
    case 113: /* q */
        this.exitCode = this.stackStack.pop();
        this.finished = true;
        this.keepRunning = false;
        break;
    case 114: /* r */
        this.reverseDelta();
        break;
    case 115: /* s */
        this.moveIP();
        a = this.stackStack.pop();
        this.fungeSpace.put(this.ip, a);
        break;
    case 116: /* t */
        this.reverseDelta();
        break;
    case 117: /* u */
        if (this.stackStack.soss() === null)
            this.reverseDelta();
        else
            this.stackStack.stackUnderStack(this.stackStack.pop());
        break;
    case 118: /* v */
        this.delta = new Vec2(0, 1);
        break;
    case 119: /* w */
        b = this.stackStack.pop();
        a = this.stackStack.pop();
        if (a > b)
            this.delta = this.delta.rotateCW();
        else if (a < b)
            this.delta = this.delta.rotateCCW();
        break;
    case 120: /* x */
        this.delta = this.stackStack.popVec2();
        break;
    case 121: /* y */
        a = this.stackStack.pop();
        var stackSizes = this.stackStack.data.map(function(e) {
            return e.length;
        }), now = new Date();
        var args = [this.filename].concat(this.extraArguments);
        var environment = {
            "OS": "JavaScript"
        };
        this.stackStack.push(0);                                            /* env variables terminator */
        for (var name in environment) {
            if (environment.hasOwnProperty(name)) {
                this.stackStack.push(0);                                    /* env variable terminator */
                for (j = environment[name].length - 1; j >= 0; j--)
                    this.stackStack.push(environment[name].charCodeAt(j));  /* env variable value */
                this.stackStack.push(61);                                   /* env variable = sign */
                for (j = name.length - 1; j >= 0; j--)
                    this.stackStack.push(name.charCodeAt(j));               /* env variable name */
            }
        }
        this.stackStack.push(0);                                            /* command line arg list terminator */
        this.stackStack.push(0);                                            /* command line arg list terminator */
        for (i = args.length - 1; i >= 0; i--) {
            this.stackStack.push(0);                                        /* command lne arg terminator */
            for (j = args[i].length - 1; j >= 0; j--)
                this.stackStack.push(args[i].charCodeAt(j));                /* command line arg */
        }
        for (i = 0; i < stackSizes.length; i++)
            this.stackStack.push(stackSizes[i]);                            /* stack sizes */
        this.stackStack.push(stackSizes.length);                            /* stack stack size */
        this.stackStack.push(now.getHours() << 16                           /* hour */
                           | now.getMinutes() << 8                          /* minute */
                           | now.getSeconds()                               /* second */ );
        this.stackStack.push(((now.getFullYear() - 1900) & 0xFF) << 16      /* year */
                           | now.getMonth() << 8                            /* month */
                           | now.getDate()                                  /* day */ );
        this.stackStack.push(this.fungeSpace.maxX - this.fungeSpace.minX);  /* maxX - minX */
        this.stackStack.push(this.fungeSpace.maxY - this.fungeSpace.minY);  /* maxY - minY */
        this.stackStack.push(this.fungeSpace.minX);                         /* minX */
        this.stackStack.push(this.fungeSpace.minY);                         /* minY */
        this.stackStack.pushVec2(this.offset);                              /* IP storage offset */
        this.stackStack.pushVec2(this.delta);                               /* IP delta */
        this.stackStack.pushVec2(this.ip);                                  /* IP position */
        this.stackStack.push(0);                                            /* team identifier */
        this.stackStack.push(0);                                            /* IP identifier */
        this.stackStack.push(2);                                            /* dimensions */
        this.stackStack.push("/".charCodeAt());                             /* path separator */
        this.stackStack.push(0);                                            /* = paradigm */
        this.stackStack.push(100);                                          /* version 1.00 */
        this.stackStack.push(0x4a533938);                                   /* handprint "JS98" */
        this.stackStack.push(4);                                            /* bytes per cell */
        this.stackStack.push(0 << 0                                         /* t implemented */
                           | 0 << 1                                         /* i implemented */
                           | 0 << 2                                         /* o implemented */
                           | 0 << 3                                         /* = implemented */
                           | 0 << 4                                         /* unbuffered STDIO */ );
        if (a > 0) {
            if (a > this.stackStack.toss().length)
                throw new Error("Too large argument to y");
            var saved = this.stackStack.toss()[this.stackStack.toss().length - a];
            var pushed = this.stackStack.toss().length - stackSizes[stackSizes.length - 1];
            this.stackStack.clear(pushed);
            this.stackStack.push(saved);
        }
        break;
    case 122: /* z */
        break;
    case 123: /* { */
        a = this.stackStack.pop();
        this.stackStack.beginBlock(a, this.offset);
        this.offset = this.ip.add(this.delta);
        break;
    case 124: /* | */
        a = this.stackStack.pop();
        if (a === 0)
            this.delta = new Vec2(0, 1);
        else
            this.delta = new Vec2(0, -1);
        break;
    case 125: /* } */
        if (this.stackStack.soss() === null) {
            this.reverseDelta();
        } else {
            a = this.stackStack.pop();
            this.offset = this.stackStack.endBlock(a);
        }
        break;
    case 126: /* ~ */
        try {
            character = this.nextInput();
            this.stackStack.push(character.charCodeAt());
        } catch (e) {
            return false;
        }
        break;
    default:
        /*
        if (Util.isPrintable(instruction))
            throw new Error("Unimplemented instruction '" + String.fromCharCode(instruction) + "'");
        else
            throw new Error("Unimplemented instruction " + instruction);
        */
        this.reverseDelta();
        break;
    }
    return true;
};
BefungeEngine.prototype.run = function(internal) {
    if (this.keepRunning && !internal)
        return;
    this.keepRunning = true;
    for (var count = 0; this.keepRunning && count < (this.delayOn ? 1 : BefungeEngine.RUN_BLOCK_SIZE); count++)
        this.step();
    if (!this.delayOn)
        this.updateCallback();
    if (this.keepRunning) {
        var $this = this;
        this.runTimeout = setTimeout(function() {
            if ($this.runTimeout !== -1)
                $this.runTimeout = -1;
            if ($this.keepRunning)
                $this.run(true);
        }, this.delayOn ? this.delay : 1);
    }
};
BefungeEngine.prototype.stop = function() {
    this.keepRunning = false;
    if (this.runTimeout !== -1)
        clearTimeout(this.runTimeout);
};
BefungeEngine.fingerprints = {};
