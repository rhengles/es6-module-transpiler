import CompileError from './compile_error';
import { isEmpty, array, forEach } from './utils';

class AbstractCompiler {
  constructor(compiler, options) {
    this.compiler = compiler;

    this.exports = compiler.exports;
    this.exportDefault = compiler.exportDefault;
    this.imports = compiler.imports;
    this.directives = compiler.directives;

    this.moduleName = compiler.moduleName;
    this.lines = compiler.lines;
    this.string = compiler.string;

    this.options = options;
    this.eol = this.getEol();
    this.indent = this.getIndent();

    var allDependencies = this.imports.concat(this.exports.filter(function(export_) {
      return export_.source !== null;
    }));

    this.dependencyNames = array.uniq(allDependencies.map(function(dep) {
      return dep.source.value;
    }));
  }

  getEol() {
    var eol = this.options.eol;
    if ( eol ) {
      return eol.replace("\\r", "\r").replace("\\n", "\n");
    } else {
      return "\n";
    }
  }

  getIndent() {
    var options = this.options;
    return options && options.indent || "  ";
  }

  buildImports() {
    var imports = this.imports,
        moduleImports = this.moduleImports,
        source  = this.source;

    for (var idx = 0; idx < imports.length; idx++) {
      var import_ = imports[idx],
          replacement = "";

      var dependencyName = import_.source.value;

      if (import_.type === "ModuleDeclaration" && import_.source.type === "Literal") {
        replacement = this.doModuleImport(import_.id.name, dependencyName, idx);
      } else if (import_.type === "ImportDeclaration") {
        if (import_.kind === "default") {
          // var name = __dependencyX__;
          var specifier = import_.specifiers[0];
          replacement = this.doDefaultImport(specifier.id.name, dependencyName, idx);
        } else if (import_.kind === "named") {
          // var one = __dependencyX__.one;
          // var two = __dependencyX__.two;
          replacement = this.doImportSpecifiers(import_, idx);
        } else if (import_.kind === undefined) {
          replacement = this.doBareImport(import_.source.value);
        }
      }

      source.replace(import_.range[0], import_.range[1]-1, replacement);
    }
  }

  buildExports() {
    var source        = this.source,
        exports_      = this.exports;

    for (var export_ of exports_) {
      var replacement = "";
      
      if (export_.default) {
        var identifier = export_.declaration.name || null;
        source.replace(export_.range[0],
                       export_.declaration.range[0] - 1, 
                       this.doDefaultExport(identifier));
      } else if (export_.specifiers) {
        var reexport;
        if (export_.source) {
          reexport = export_.source.value;
        }
				replacement = [];
        for (var specifier of export_.specifiers) {
          replacement.push(this.doExportSpecifier(specifier.id.name, reexport));
        }
				replacement = replacement.join(this.eol);
        source.replace(export_.range[0], export_.range[1], replacement);
      } else if (export_.declaration) {

        if (export_.declaration.type === "VariableDeclaration") {
          var name = export_.declaration.declarations[0].id.name;

          // remove the "export" keyword
          source.replace(export_.range[0], export_.declaration.range[0] -1, "");
          // add a new line
          replacement = this.doExportDeclaration(name);
          source.replace(export_.range[1], export_.range[1], replacement);
        } else if (export_.declaration.type === "FunctionDeclaration") {
          var name = export_.declaration.id.name;

          source.replace(export_.range[0], export_.declaration.range[0] - 1, "");

          replacement = this.doExportDeclaration(name);
          source.replace(export_.range[1] + 1, export_.range[1] + 1, replacement);
        } else if (export_.declaration.type === "Identifier") {
          var name = export_.declaration.name;

          replacement = this.doExportDeclaration(name);
          source.replace(export_.range[0], export_.range[1] - 1, replacement);
        }

      }
    }
  }

  indentLines(n) {
    var indent = new Array((+n||0)+1).join(this.indent);
    var eol = this.eol;
    var innerLines = this.source.toString().split(eol);
    var inner = innerLines.reduce(function(acc, item) {
      if (item === "") return acc + eol;
      return acc + indent + item + eol;
    }, "");

    return inner.replace(/\s+$/, "");
  }
}

export default AbstractCompiler;
