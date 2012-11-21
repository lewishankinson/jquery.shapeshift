;(function($,window,undefined) {
  var pluginName = 'shapeshift',
      document = window.document,
      defaults = {
        // Features
        centerGrid: true,
        enableAnimation: true,
        enableAutoHeight: true,
        enableDrag: true,
        enableDragAnimation: true,
        enableDrop: true,
        enableResize: true,

        // Options
        childWidth: null,
        columns: null,
        dragBlacklist: null,
        dropWhitelist: "*",
        gutterX: 10,
        gutterY: 10,
        paddingY: 0,
        paddingX: 0,
        selector: "",
      };

  function Plugin(element, options) {
    var ss = this;
    ss.element = element;
    ss.container = $(element);
    ss.options = $.extend({}, defaults, options);
    ss.hoverObjPositions = [];
    ss.init();
  }

  Plugin.prototype.init = function() {
    var ss = this,
        options = ss.options;

    // The initial shapeshift
    ss.shiftit(ss.container, options.enableAnimation);

    // Enable features
    if(options.enableDrag || options.enableDrop) { ss.draggable(); }
    if(options.enableResize) { ss.resizable(); }
  };

  Plugin.prototype.shiftit = function($container, animated) {
    var ss = this,
        options = ss.options,
        $objects = $container.children(options.selector).filter(':visible');

    // Calculate the positions for each element
    positions = ss.getObjectPositions($container, ':visible');

    // Animate / Move each object into place
    for(var obj_i=0; obj_i < $objects.length; obj_i++) {
      var $obj = $($objects[obj_i]),
          attributes = positions[obj_i];

      // Never animate the currently dragged item
      if(!$obj.hasClass("ss-moving")) {
        if(animated) {
          $obj.stop(true, false).animate(attributes, 250);
        } else {
          $obj.css(attributes);
        }
      }
    }

    // Set the container height to match the tallest column
    $container.css("height", options.containerHeight);
  }

  Plugin.prototype.draggable = function () {
    var ss = this,
        options = ss.options,
        $container = $currentContainer = $previousContainer = ss.container,
        $objects = $container.children(options.selector),
        $selected = null,
        dragging = false;

    // Initialize the jQuery UI Draggable or destroy current instances
    if(options.enableDrag) {
      $objects.filter(options.dropWhitelist).filter(":not("+options.dragBlacklist+")").draggable({
        addClasses: false,
        containment: 'document',
        zIndex: 9999,
        start: function() { dragStart($(this)); },
        drag: function(e, ui) { dragObject(e, ui); }
      });
    } else { $objects.draggable('destroy'); }

    // Initialize the jQuery UI Droppable or destroy current instances
    if(options.enableDrop) {
      $container.droppable({
        accept: options.dropWhitelist,
        over: function(e) { dragOver(e); },
        drop: function() { dropObject(); }
      });
    } else { $container.droppable('destroy'); }

    // When an object is picked up
    function dragStart($object) {
      $selected = $object.addClass("ss-moving");
      ss.shiftit($container, options.enableDragAnimation);
    }

    // When an object is dragged around
    function dragObject(e, ui) {
      notDroppable = ($container[0] == $currentContainer[0]) && !options.enableDrop;
      if(!dragging && !notDroppable) {
        dragging = true;
        $objects = $currentContainer.children(options.selector).filter(':visible');

        // Determine where the intended index position of the object is
        var intendedIndex = ss.getIntendedIndex($selected, e),
            $intendedObj = $($objects.not(".ss-moving").get(intendedIndex));
        $previousContainer = $selected.parent();

        // Insert the object into that index position
        if(intendedIndex == ($objects.not(".ss-moving").size() - 1) && e.pageY > ($intendedObj.offset().top + ($intendedObj.outerHeight() / 2))) {
          $selected.insertAfter($intendedObj);
        } else {
          $selected.insertBefore($intendedObj);
        }

        // Reshift the new container / old container
        ss.shiftit($currentContainer, options.enableDragAnimation);
        if($currentContainer[0] != $previousContainer[0]) {
          ss.shiftit($previousContainer, options.enableDragAnimation);
        }

        // Prevent it from firing too much
        window.setTimeout(function() {
          dragging = false;
        }, 200);
      }

      // Manually override the elements position
      ui.position.left = e.pageX - $(e.target).parent().offset().left - (options.childWidth / 2);
      ui.position.top = e.pageY - $(e.target).parent().offset().top - ($selected.outerHeight() / 2);
    }

    // When an object is dropped
    function dropObject() {
      $selected = $(".ss-moving").removeClass("ss-moving");
      ss.shiftit($currentContainer, options.animateOnDrag);
      $currentContainer.trigger("shapeshifted", $selected);
    }

    // When an object moves to a new container
    function dragOver(e) {
      $currentContainer = $(e.target);
      ss.setHoverObjPositions($currentContainer);
    }
  }

  Plugin.prototype.getIntendedIndex = function($selected, e) {
    var ss = this,
        options = ss.options,
        $container = $selected.parent(),
        selectedX = $selected.position().left + (options.childWidth / 2),
        selectedY = $selected.position().top + ($selected.outerHeight() / 2),
        shortestDistance = 9999,
        chosenIndex = 0;

    // Get the grid based on all the elements except
    // the currently dragged element
    ss.setHoverObjPositions($container);

    // Go over all of those positions and figure out
    // which is the closest to the cursor.
    for(hov_i=0;hov_i<ss.hoverObjPositions.length;hov_i++) {
      attributes = ss.hoverObjPositions[hov_i];
      if(selectedX > attributes.left && selectedY > attributes.top) {
        xDist = selectedX - attributes.left;
        yDist = selectedY - attributes.top;
        distance = Math.sqrt((xDist * xDist) + (yDist * yDist));
        if(distance < shortestDistance) {
          shortestDistance = distance;
          chosenIndex = hov_i;
        }
      }
    }
    return chosenIndex;
  }

  Plugin.prototype.setHoverObjPositions = function($container) {
    this.hoverObjPositions = this.getObjectPositions($container, ':not(.ss-moving):visible');
  }

  Plugin.prototype.getObjectPositions = function ($container, filter) {
    var options = this.options,
        $objects = $container.children(options.selector).filter(filter),
        columns = options.columns,
        colHeights = [],
        colWidth = null,
        gridOffset = options.paddingX,
        positions = [];

    // Determine the width of each element.
    if(!options.childWidth) { options.childWidth = $objects.first().outerWidth(true); }

    // Determine the column width.
    colWidth = options.childWidth + options.gutterX;

    // Determine how many columns are currently active
    if(!columns) { columns = Math.floor($container.innerWidth() / colWidth); }

    // Offset the grid to center it.
    if(options.centerGrid) {
      gridOffset = Math.floor((($container.innerWidth() / colWidth) % 1 * colWidth) / 2);
    }

    // Create an array element for each column, which is then
    // used to store that columns current height.
    for(var i=0;i<columns;i++) {colHeights.push(options.paddingY);}

    // Loop over each element and determine what column it fits into
    for(var obj_i=0;obj_i<$objects.length;obj_i++) {
      var $obj = $($objects[obj_i]),
          col = $.inArray(Math.min.apply(window,colHeights), colHeights),
          height = $obj.outerHeight(true) + options.gutterY,
          offsetX = (colWidth * col) + gridOffset,
          offsetY = colHeights[col];

      // Store the position to animate into place later
      attributes = { left: offsetX, top: offsetY };
      positions[obj_i] = attributes;

      // Increase the calculated total height of the current column
      colHeights[col] += height;
    }
    // Store the height of the tallest column
    if(options.enableAutoHeight){
      options.containerHeight = Math.max.apply(Math,colHeights);
    }
    return positions;
  }

  Plugin.prototype.resizable = function () {
    var ss = this,
        options = ss.options,
        $container = ss.container,
        resizing = false;

    $(window).on("resize", function() {
      if(!resizing) {
        resizing = true;
        ss.shiftit($container, options.enableAnimation);
        setTimeout(function() {
          resizing = false;
          ss.shiftit($container, options.enableAnimation);
        }, 333);
      }
    });
  }

  // Prevent against multiple instantiations
  $.fn[pluginName] = function (options) {
    return this.each(function () {
      $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
    });
  }

}(jQuery, window));