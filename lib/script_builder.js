(function() {
  "use strict";

  var BREAK, INDENT, OUTDENT, ScriptBuilder, Unique,
    __slice = [].slice;

  Unique = require("./utils").Unique;

  INDENT = {
    indent: true
  };

  OUTDENT = {
    outdent: true
  };

  BREAK = {
    "break": true
  };

  ScriptBuilder = (function() {

    ScriptBuilder.prototype["break"] = BREAK;

    ScriptBuilder.prototype.global = 'window';

    ScriptBuilder.prototype.lf = '\n';

    ScriptBuilder.prototype.strict = '"use strict"';

    function ScriptBuilder() {
      this.buffer = [];
    }

    ScriptBuilder.prototype.setOptions = function(opt) {
      this.options = opt;
      (opt.eol != null) && (this.lf = opt.eol);
      return (opt.strict != null) && (this.strict = opt.strict);
    };

    ScriptBuilder.prototype._repeatStr = function(str, nr) {
      return (new Array(nr + 1)).join(str);
    };

    ScriptBuilder.prototype._indentString = function() {
      var indent, reSpc, reTab;
      reTab = /^t(|ab)$/i;
      reSpc = /^\d+$/;
      indent = this.options && this.options.indent;
      if (reTab.test(indent)) {
        return '\t';
      }
      indent = reSpc.test(indent) ? parseInt(indent, 10) : 2;
      return this._repeatStr(' ', indent);
    };

    ScriptBuilder.prototype.useStrict = function() {
      return this.strict && this.line(this.strict);
    };

    ScriptBuilder.prototype.set = function(lhs, rhs) {
      return this.line("" + (this.capture(lhs)) + " = " + (this.capture(rhs)));
    };

    ScriptBuilder.prototype.call = function(fn, args, indented) {
      var arg, end, i, result, _i, _len;
      fn = this._wrapCallable(fn);
      args = this._prepareArgsForCall(args);
      end = args.length - 1;
      while (args[end] === BREAK) {
        end--;
      }
      result = "" + fn + "(";
      for (i = _i = 0, _len = args.length; _i < _len; i = ++_i) {
        arg = args[i];
        if (arg === BREAK) {
          this.append(result);
          if (!indented) {
            indented = true;
            this.indent();
          }
          result = '';
        } else {
          result += arg;
          if (i < end) {
            result += ',';
            if (args[i + 1] !== BREAK) {
              result += ' ';
            }
          }
        }
      }
      result += ')';
      this.append(result);
      if (indented) {
        return this.outdent();
      }
    };

    ScriptBuilder.prototype._prepareArgsForCall = function(args) {
      var result,
        _this = this;
      if (typeof args === 'function') {
        result = [];
        args(function(arg) {
          return result.push(_this.capture(arg));
        });
        args = result;
      }
      return args;
    };

    ScriptBuilder.prototype._wrapCallable = function(fn) {
      var functionCalled, functionImpl, lf, result,
        _this = this;
      if (typeof fn !== 'function') {
        return fn;
      }
      functionImpl = this["function"];
      functionCalled = false;
      this["function"] = function() {
        var args;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        functionCalled = true;
        return functionImpl.call.apply(functionImpl, [_this].concat(__slice.call(args)));
      };
      result = this.capture(fn);
      lf = this.lf;
      this["function"] = functionImpl;
      if (functionCalled) {
        result = "(" + result + (this._functionTail != null ? '' : lf) + ")";
      }
      return result;
    };

    ScriptBuilder.prototype["function"] = function(args, body, noIndent) {
      this.append(this._functionHeader(args));
      if (!noIndent) {
        this.indent();
      }
      body();
      if (!noIndent) {
        this.outdent();
      }
      if (this._functionTail != null) {
        return this.append(this._functionTail());
      }
    };

    ScriptBuilder.prototype.print = function(value) {
      value = JSON.stringify(this.capture(value));
      if (this.options.squotes) {
        return this.squotify(value);
      } else {
        return value;
      }
    };

    ScriptBuilder.prototype.squotify = function(value) {
      if (/\\'/.test(value)) {
        return value;
      } else {
        return value.replace(/"/g, '\'');
      }
    };

    ScriptBuilder.prototype.prop = function(object, prop) {
      return this.append("" + (this.capture(object)) + "." + (this.capture(prop)));
    };

    ScriptBuilder.prototype.unique = function(prefix) {
      return new Unique(prefix);
    };

    ScriptBuilder.prototype.line = function(code) {
      return this.append(this.capture(code) + this.eol);
    };

    ScriptBuilder.prototype.append = function() {
      var code, _ref;
      code = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return (_ref = this.buffer).push.apply(_ref, code);
    };

    ScriptBuilder.prototype.indent = function() {
      return this.buffer.push(INDENT);
    };

    ScriptBuilder.prototype.outdent = function() {
      return this.buffer.push(OUTDENT);
    };

    ScriptBuilder.prototype.capture = function(fn) {
      var buffer, result;
      if (typeof fn !== 'function') {
        return fn;
      }
      buffer = this.buffer;
      this.buffer = [];
      fn();
      result = this.toString();
      this.buffer = buffer;
      return result;
    };

    ScriptBuilder.prototype.toString = function() {
      var chunk, indent, indentStr, lf, line, result, _i, _j, _len, _len1, _ref, _ref1;
      indent = 0;
      result = [];
      indentStr = this._indentString();
      lf = this.lf;
      _ref = this.buffer;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        chunk = _ref[_i];
        if (chunk === INDENT) {
          indent++;
        } else if (chunk === OUTDENT) {
          indent--;
        } else {
          _ref1 = chunk.split(lf);
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            line = _ref1[_j];
            if (/^\s*$/.test(line)) {
              result.push(line);
            } else {
              result.push(this._repeatStr(indentStr, indent) + line);
            }
          }
        }
      }
      return result.join(lf);
    };

    return ScriptBuilder;

  })();

  module.exports = ScriptBuilder;

}).call(this);
