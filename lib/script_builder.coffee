"use strict"
Unique = require("./utils").Unique

INDENT  = indent: yes
OUTDENT = outdent: yes
BREAK   = break: yes

class ScriptBuilder
  break: BREAK
  global: 'window'

  constructor: ->
    @buffer = []

  setOptions: (opt) ->
    @options = opt

  _repeatStr: (str, nr) ->
    return (new Array(nr+1)).join(str)

  _indentString: ->
    reTab = /^t(|ab)$/i
    reSpc = /^\d+$/
    indent = @options and @options.indent
    return '\t' if reTab.test(indent)
    indent = if reSpc.test(indent) then parseInt(indent, 10) else 2
    return @_repeatStr(' ', indent)

  useStrict: ->
    @line '"use strict"'

  set: (lhs, rhs) ->
    @line "#{@capture lhs} = #{@capture rhs}"

  call: (fn, args) ->
    fn   = @_wrapCallable fn
    args = @_prepareArgsForCall args

    end = args.length - 1
    end-- while args[end] is BREAK

    result = "#{fn}("
    indented = no
    for arg, i in args
      if arg is BREAK
        @append result
        unless indented
          indented = yes
          @indent()
        result = ''
      else
        result += arg
        if i < end
          result += ','
          result += ' ' unless args[i+1] is BREAK
    result += ')'
    @append result
    @outdent() if indented

  _prepareArgsForCall: (args) ->
    if typeof args is 'function'
      result = []
      args (arg) => result.push @capture(arg)
      args = result
    return args

  _wrapCallable: (fn) ->
    return fn if typeof fn isnt 'function'
    functionImpl = @function
    functionCalled = no
    @function = (args...) =>
      functionCalled = yes
      functionImpl.call(this, args...)
    result = @capture fn
    @function = functionImpl
    if functionCalled
      result = "(#{result}#{if @_functionTail? then '' else '\n'})"
    return result

  function: (args, body) ->
    @append @_functionHeader(args)
    @indent()
    body()
    @outdent()
    @append @_functionTail() if @_functionTail?

  print: (value) ->
    JSON.stringify(@capture value)

  prop: (object, prop) ->
    @append "#{@capture object}.#{@capture prop}"

  unique: (prefix) ->
    new Unique(prefix)

  line: (code) ->
    @append @capture(code) + @eol

  append: (code...) ->
    @buffer.push code...

  indent: ->
    @buffer.push INDENT

  outdent: ->
    @buffer.push OUTDENT

  capture: (fn) ->
    return fn if typeof fn isnt 'function'
    buffer = @buffer
    @buffer = []
    fn()
    result = @toString()
    @buffer = buffer
    return result

  toString: ->
    indent = 0
    result = []
    indentStr = @_indentString()
    for chunk in @buffer
      if chunk is INDENT
        indent++
      else if chunk is OUTDENT
        indent--
      else
        for line in chunk.split('\n')
          if /^\s*$/.test line
            result.push line
          else
            result.push @_repeatStr(indentStr, indent) + line
    return result.join('\n')


module.exports = ScriptBuilder