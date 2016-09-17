function build(tag, options) {
  var el = document.createElement(tag);
  if(options.className) { el.className = options.className; }
  if(options.id) { el.id = options.id; }
  if(options.contains) {
    options.contains.forEach(function(child) {
      el.appendChild(child);
    });
  }
  if(options.text) { el.textContent = options.text; }
  if(options.onclick) { el.onclick = options.onclick.bind(this); }
  return el;
}

var Tooltip = {
  word: document.getElementById("word"),
  definition: document.getElementById("definition"),

  toggle: function(action, word, definition) {
    this.word[action](word);
    this.definition[action](definition);
  },

  createTooltipListeners: function(element, word, definition) {
    element.addEventListener("mouseover", (event) => {
      this.toggle("appendChild", word, definition);
      event.stopPropagation();
    }, true);
    element.addEventListener("mouseout", (event) => {
      this.toggle("removeChild", word, definition);
      event.stopPropagation();
    }, true);
  },

  createHover: function(word, definition) {
    var hover = build("span", {className: "word"});
    this.createTooltipListeners(
      hover,
      document.createTextNode(word),
      document.createTextNode(definition)
    );
    return hover;
  },

  appendControls: function(controls) {
    definition.appendChild(controls);
  }
};

var Slides = {
  slides: data["slides"],
  element: document.getElementById("slides"),

  initialize: function() {
    this.slides.forEach(function(slide) {
      var section = build("section", {className: "code"});
      slide.code.split("\n").forEach(function(line) {
        section.innerHTML += '<p class="line">' + line + '</p>';
      });
      this.element.appendChild(section);
    }.bind(this));
  }
};

var NodeChirurgeon = {
  wrapSelection: function(wrapper, sel) {
    var [start, end] = this.prepareBoundaries(sel);

    start.parentNode.insertBefore(wrapper, start);

    this.walkThroughSiblings(start, end, function(node) {
      wrapper.appendChild(node);
    });
  },

  walkThroughSiblings: function(start, end, callback) {
    var cache, cursor = start;
    do {
      // cache the next sibling, since we're expecting to move
      // the cursor node around within the DOM hierarchy
      cache = cursor.nextSibling;
      callback(cursor);
      cursor = cache;
    } while (cursor != end);
  },

  prepareBoundaries: function(sel) {
    var start = this.prepare(sel.anchorNode, sel.anchorOffset);
    var end = this.prepare(sel.focusNode, sel.focusOffset);
    if(this.userDraggedRightToLeft(start, end)) {
      return [end, start];
    } else {
      return [start, end];
    }
  },

  // http://stackoverflow.com/a/23512678/16034
  userDraggedRightToLeft: function(a, b) {
    return a.compareDocumentPosition(b) === Node.DOCUMENT_POSITION_PRECEDING;
  },

  prepare: function(node, offset) {
    if(offset > 0 && offset < node.length) {
      // User selected in the middle of a text node: Hello|, world!|
      return node.splitText(offset);
    } else {
      // User selected at start/end of a text node: |Hello, world!|
      return node;
    }
  }
};

var Editor = {
  except: function(key) {
    console.log("Exception: %s", key);
  },

  addDefinition: function() {
    var selection = document.getSelection();
    var word = selection.toString();          if(word.length == 0) { throw "no selection"; }
    var definition = this.defInput.value;     if(definition.length == 0) { throw "no definition"; }
    this.defInput.value = "";

    NodeChirurgeon.wrapSelection(
      Tooltip.createHover(word, definition),
      selection
    );
  },

  activate: function() {
    this.defButton = build("button", {
      id: "add-definition",
      text: "Define",
      onclick: this.addDefinition.bind(this)
    });
    this.defInput = build("input", {id: "write-definition"});
    this.defControls = build("div", {
      id: "definition-controls",
      contains: [this.defInput, this.defButton]
    });

    Tooltip.appendControls(this.defControls);
  }
};

Slides.initialize();
Editor.activate();
