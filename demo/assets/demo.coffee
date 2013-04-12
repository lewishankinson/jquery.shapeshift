$ ->
  $containers = $(".ss-container")
  child_count = 30

  # -------------
  # Render Dummy Content
  # -------------

  do renderChildren = ->
    weighted_colspans = [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,3,3]

    $containers.each (container_i) ->
      elements = []

      for i in [0...child_count]
        if container_i is 0
          colspan = weighted_colspans[Math.floor(Math.random() * weighted_colspans.length)]
          height = colspan * 80 + ((colspan - 1) * 12)
        else
          height = Math.random() * 100 + 100
          colspan = 1
        elements.push "<li data-ss-colspan="+colspan+" style='height: "+height+"'><div class='position'></div></li>"

      $(@).append(elements.join(""))

  getRandomColor = ->
    letters = 'ABCDEF'.split('')
    color = ''
    for i in [0...letters.length]
      color += letters[Math.round(Math.random() * 5)]
    color

  do renderPlaceholders = (type = "fpoimg") ->
    $containers.each ->
      $children = $(this).children().not(".credits")
      child_count = $children.length

      if type is "index"
        $(@).find(".position").show()
      else
        for i in [0...child_count]
          $child = $($children[i])
          height = $child.height()
          width = $child.width()

          switch type
            when "fpoimg"
              background = 'url("http://fpoimg.com/'+width+'x'+height+'?bg_color='+getRandomColor()+'&text_color=444444")'
            when "placekittens"
              background = 'url("http://www.placekitten.com/'+width+'/'+height+'")'

          $child.css
            backgroundImage: background
            height: height

  # -------------
  # Initial Shapeshift
  # -------------

  filter_options =
    minColumns: 3

  $containers.shapeshift(filter_options)

  # -------------
  # Clicking the filter options
  # -------------

  $(".options ul.animation li").on "click", ->
    switch $(this).data "option"
      when "enable"
        filter_options.animated = true
      else
        filter_options.animated = false

    $containers.shapeshift filter_options

  $(".options ul.dragndrop li").on "click", ->
    console.log "!"
    switch $(this).data "option"
      when "enable"
        filter_options.enableDrag = true
        filter_options.enableDrop = true
      else
        filter_options.enableDrag = false
        filter_options.enableDrop = false

    $containers.trigger 'ss-destroy'
    $containers.shapeshift filter_options

  $(".options ul.filtering li").on "click", ->
    switch $(this).data "option"
      when "hide"
        $containers.children(":visible").sort( ->
          Math.round(Math.random())-0.5
        ).first().hide()
      else
        $containers.children(":hidden").sort( ->
          Math.round(Math.random())-0.5
        ).first().show()

    $containers.trigger "ss-rearrange"

  $(".options ul.placeholders li").on "click", ->
    renderPlaceholders $(this).data("option")

    $containers.shapeshift filter_options

  # -------------
  # Drag and Drop events for shapeshift
  # -------------

  $containers.on "ss-arranged", (e, selected) ->
    modifier = if $(@).find(".ss-dragging")[0] then 1 else 0

    $(@).children().each ->
      $(@).find(".position").text($(@).index() - modifier)

  $containers.on "ss-event-dropped", (e, selected) ->
    $selected = $(selected)
    # console.log "The dropped item is:", $selected

    # Get the index position of each object
    $objects = $(@).children()
    $objects.each (i) ->
      # console.log "Get the index position:", i
      # console.log "Get the current element:", $(@)

  $containers.on "ss-event-dragged", (e, selected) ->
    $selected = $(selected);
    # console.log "This is the item being dragged:", $selected