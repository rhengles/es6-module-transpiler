import AbstractCompiler from './abstract_compiler';
import SourceModifier from './source_modifier';

class AMDCompiler extends AbstractCompiler {
  stringify() {
    var string = this.string.toString(),  // string is actually a node buffer
        eol = this.eol,
        indent = this.indent;
    this.source = new SourceModifier(string);

    this.map = [];
    var out = this.buildPreamble(this.exports.length > 0);

    // build* mutates this.source
    this.buildImports();
    this.buildExports();

    out += this.indentLines(2);
    out += eol+indent+"});";

    return out;
  }

  buildPreamble(hasExports) {
    var out = "",
        dependencyNames = this.dependencyNames,
        eol = this.eol,
        indent = this.indent;

    if (hasExports) dependencyNames.push("exports");

    out += "define(";
    if (this.moduleName) out += `"${this.moduleName}",`;
    out += eol+indent+"[";

    // build preamble
    var idx;
    for (idx = 0; idx < dependencyNames.length; idx++) {
      var name = dependencyNames[idx];
      out += `"${name}"`;
      if (!(idx === dependencyNames.length - 1)) out += ",";
    }

    out += "],"+eol+indent+"function(";

    for (idx = 0; idx < dependencyNames.length; idx++) {
      if (dependencyNames[idx] === "exports") {
        out += "__exports__";
      } else {
        out += `__dependency${idx+1}__`;
        this.map[dependencyNames[idx]] = idx+1;
      }
      if (!(idx === dependencyNames.length - 1)) out += ", ";
    }

    out += ") {"+eol;

    out += indent+indent+'"use strict";'+eol;

    return out;
  }

  doModuleImport(name, dependencyName, idx) {
    return `var ${name} = __dependency${this.map[dependencyName]}__;`;
  }

  doBareImport(name) {
    return "";
  }

  doDefaultImport(name, dependencyName, idx) {
    if (this.options.compatFix === true) {
      return `var ${name} = __dependency${this.map[dependencyName]}__["default"] || __dependency${this.map[dependencyName]}__;`;
    } else {
      return `var ${name} = __dependency${this.map[dependencyName]}__["default"];`;
    }
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

  doDefaultExport() {
    return `__exports__["default"] = `;
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

export default AMDCompiler;
