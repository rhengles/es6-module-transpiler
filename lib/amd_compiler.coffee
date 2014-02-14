"use strict"
AbstractCompiler = require("./abstract_compiler")
path = require("path")
isEmpty = require("./utils").isEmpty

class AMDCompiler extends AbstractCompiler
  stringify: ->
    @build (s) =>
      [ wrapperArgs, preamble ] = @buildPreamble(@dependencyNames)

      unless isEmpty(@exports)
        @dependencyNames.push 'exports'
        wrapperArgs.push '__exports__'

      for i of @dependencyNames
        dependency = @dependencyNames[i]
        if /^\./.test(dependency)
          # '..' makes up for path.join() treating a module name w/ no extension
          # as a folder
          @dependencyNames[i] = path.join(@moduleName, '..', dependency).replace(/[\\]/g, '/')

      s.line =>
        s.call 'define', (arg) =>
          arg s.print(@moduleName) if @moduleName
          arg s.break
          arg s.print(@dependencyNames)
          arg s.break
          arg =>
            s.function wrapperArgs, =>
              s.useStrict()
              s.append preamble if preamble
              s.append @lines...

              for exportName, exportValue of @exports
                s.line "__exports__.#{exportName} = #{exportValue}"

              if @exportDefault
                s.line "return #{@exportDefault}"


module.exports = AMDCompiler