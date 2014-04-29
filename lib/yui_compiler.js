import AbstractCompiler from './abstract_compiler';
import SourceModifier from './source_modifier';

class YUICompiler extends AbstractCompiler {
  stringify() {
    var string = this.string.toString();  // string is actually a node buffer
    this.source = new SourceModifier(string);

    var out = this.buildPreamble();

    // build* mutates this.source
    this.buildImports();
    this.buildExports();

    out += `${this.indentLines(2)}
    return __exports__;
}, "@VERSION@", ${this.buildMetas()});`;

    return out;
  }

  buildPreamble() {
    var name = this.moduleName || "@NAME@"; // support for anonymous modules
    return `YUI.add("${name}", function(Y, NAME, __imports__, __exports__) {
    "use strict";
`;
  }

  buildMetas() {
    return JSON.stringify({ es: true, requires: this.dependencyNames });
  }

  doModuleImport(name, dependencyName, idx) {
    return `var ${name} = __imports__["${dependencyName}"];`;
  }

  doBareImport(name) {
    return "";
  }

  doDefaultImport(name, dependencyName, idx) {
    if (this.options.compatFix === true) {
      return `var ${name} = __imports__["${dependencyName}"]["default"] || __imports__["${dependencyName}"];`;
    } else {
      return `var ${name} = __imports__["${dependencyName}"]["default"];`;
    }
  }

  doNamedImport(name, dependencyName, alias) {
    var member = (name === 'default' ? '["default"]' : '.' + name);
    return `var ${alias} = __imports__["${dependencyName}"]${member};`;
  }

  doExportSpecifier(name, reexport) {
    if (reexport) {
      return `__exports__.${name} = __imports__["${reexport}"].${name};`;
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

export default YUICompiler;
