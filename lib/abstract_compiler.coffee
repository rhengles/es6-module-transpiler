"use strict"
CompileError = require("./compile_error")
JavaScriptBuilder = require("./java_script_builder")
CoffeeScriptBuilder = require("./coffee_script_builder")
isEmpty = require("./utils").isEmpty

class AbstractCompiler
  constructor: (compiler, options) ->
    @compiler = compiler

    @exports = compiler.exports
    @exportDefault = compiler.exportDefault
    @imports = compiler.imports
    @importDefault = compiler.importDefault

    @moduleName = compiler.moduleName
    @lines = compiler.lines

    @options = options

    @dependencyNames = []
    @dependencyNames.push name for own name of @imports when name not in @dependencyNames
    @dependencyNames.push name for own name of @importDefault when name not in @dependencyNames

    @assertValid()

  assertValid: ->
    if @exportDefault and !isEmpty(@exports)
      throw new CompileError("You cannot use both `export default` and `export` in the same module")

  buildPreamble: (names) ->
    args = []

    preamble = @build (s) =>
      number = 0
      deps = s.unique('dependency')

      for name in names
        if name of @importDefault
          args.push @importDefault[name]
        else
          dependency = deps.next()
          args.push dependency
          @buildImportsForPreamble s, @imports[name], dependency

    return [ args, preamble ]

  build: (fn) ->
    if @options.coffee
      builder = new CoffeeScriptBuilder()
    else
      builder = new JavaScriptBuilder()
    builder.setOptions(@options)
    fn builder
    return builder.toString()

  buildImportsForPreamble: (builder, imports_, dependencyName) ->
    for own name, alias of imports_
      builder.var alias, -> builder.prop dependencyName, name



module.exports = AbstractCompiler