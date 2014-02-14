"use strict"
isEmpty = (object) ->
  for foo of object
    return false
  true

class Unique
  constructor: (@prefix) ->
    @index = 1

  next: ->
    "__#{@prefix}#{@index++}__"


exports.isEmpty = isEmpty
exports.Unique = Unique