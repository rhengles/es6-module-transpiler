import AbstractCompiler from './abstract_compiler';
import SourceModifier from './source_modifier';

class GlobalsCompiler extends AbstractCompiler {
  stringify() {
    var string = this.string.toString();  // string is actually a node buffer
    this.source = new SourceModifier(string);

    this.map = [];
    var out = this.buildPreamble(this.exports.length > 0);

    this.buildImports();
    this.buildExports();

    if (!this.options.imports) this.options.imports = {};
    if (!this.options.global) this.options.global = "window";

    out += this.indentLines(1);
    out += this.eol+"})";
    out += this.buildSuffix();
    out += ";";

    return out;
  }

  buildPreamble() {
    var out = "",
        dependencyNames = this.dependencyNames;

    out += "(function(";

    if (this.exports.length > 0) {
      out += "__exports__";
      if (this.dependencyNames.length > 0) {
        out += ', ';
      }
    }

    for (var idx = 0; idx < dependencyNames.length; idx++) {
      out += `__dependency${idx+1}__`;
      this.map[dependencyNames[idx]] = idx+1;
      if (!(idx === dependencyNames.length - 1)) out += ", ";
    }

    out += ") {"+this.eol;

    out += '  "use strict";'+this.eol;

    return out;
  }

  buildSuffix() {
    var dependencyNames = this.dependencyNames;
    var out = "(";

    if (this.exports.length > 0) {
      if (this.options.into) {
        out += `${this.options.global}.${this.options.into} = {}`;
      } else {
        out += this.options.global;
      }
      if (this.dependencyNames.length > 0) {
        out += ', ';
      }
    }

    for (var idx = 0; idx < dependencyNames.length; idx++) {
      var name = dependencyNames[idx];
      out += `${this.options.global}.${this.options.imports[name] || name}`;
      if (!(idx === dependencyNames.length - 1)) out += ", ";
    }

    out += ")";
    return out;
  }

  doModuleImport(name, dependencyName, idx) {
    return `var ${name} = __dependency${this.map[dependencyName]}__;`;
  }

  doBareImport(name) {
    return "";
  }

  doDefaultImport(name, dependencyName, idx) {
    return `var ${name} = __dependency${this.map[dependencyName]}__;`;
  }

  doNamedImport(name, dependencyName, alias) {
    return `var ${alias} = __dependency${this.map[dependencyName]}__.${name};`;
  }

  doExportSpecifier(name, reexport) {
    if (reexport) {
      return `__exports__.${name} = __dependency${this.map[reexport]}__.${name};`;
    }
    return `__exports__.${name} = ${name};`;
  }

  doExportDeclaration(name) {
    return `${this.eol}__exports__.${name} = ${name};`;
  }

  doDefaultExport(identifier) {
    if (identifier === null) {
      throw new Error("The globals compiler does not support anonymous default exports.");
    }
    return `__exports__.${identifier} = `;
  }

  doImportSpecifiers(import_, idx) {
    var dependencyName = import_.source.value;
    var replacement = [];
    for (var specifier of import_.specifiers) {
      var alias = specifier.name ? specifier.name.name : specifier.id.name;
      replacement.push(this.doNamedImport(specifier.id.name, dependencyName, alias));
    }
    return replacement.join(this.eol);
  }

}

export default GlobalsCompiler;
