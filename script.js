function build(tag, options) {
  var element = document.createElement(tag),
      copy    = (k,v) => element[k] = v,
      recipes = {
        className:   copy,
        id:          copy,
        contains:    (k,v) => { v.forEach((c) => element.appendChild(c)) },
        text:        (k,v) => { element.textContent = v },
        class:       (k,v) => { element.className = v },
        textContent: copy,
        onclick:     copy
      };

  for (var k in recipes) {
    if(options[k]) { recipes[k](k, options[k]); }
  }
  return element;
}

/*
 * Slides
 *
 * Displays documents on the page.
 *
 * Call initialize() to get started.
 *
 **/

var Slides = {
  slides: [],
  element: null,

  slideAttr: "data-slide-index",

  initialize: function() {
    this.slides = data["slides"];
    this.element = document.getElementById("slides");
    this.slides.forEach(this.buildSlide.bind(this));

    TooltipManager.initialize();
  },

  buildSlide: function(slide, index) {
    if(slide.saved) {
      var section = Serializer.rebuild(slide.saved);
    } else {
      var section = build("section", {className: "code"});
      slide.code.split("\n").forEach(function(line) {
        section.innerHTML += '<p class="line">' + line + '</p>';
      });
    }
    section.setAttribute(this.slideAttr, index);
    this.element.appendChild(section);
  },

  addWord: function(elWord, definition, save=true) {
    TooltipManager.watch(elWord, definition);
    elWord.definition = definition;
    if(save) this.update(elWord);
  },

  update: function(elWord) {
    var elSlide = this.findSlide(elWord),
        index   = elSlide.getAttribute(this.slideAttr),
        slide   = this.slides[index];
    slide.saved = Serializer.save(elSlide);
    this.sync();
  },

  sync: function(data, index) {
    ajax("/save", this.slides);
  },

  findSlide: function(el) {
    if(el.hasAttribute(this.slideAttr)) return el;
    else return this.findSlide(el.parentNode);
  },

  appendControls: function(controls) {
    this.element.appendChild(controls);
  }
};

var Serializer = {
  rebuild: function(saved, index) {
    if(saved.tag) var n = document.createElement(saved.tag);
    else if(saved.data) var n = document.createTextNode(saved.data);
    if(saved.class) n.className = saved.class;
    saved.children.forEach((c) => n.appendChild(this.rebuild(c)));
    if(saved.definition) Slides.addWord(n, saved.definition, false);
    return n;
  },

  save: function(node) {
    return {
      tag: node.tagName,
      class: node.className,
      definition: node.definition,
      data: node.data,
      children: node.childNodes.map((n) => this.save(n))
    };
  }
};


/*
 * Editor
 *
 * Enable live creation of new definition Words.
 *
 **/

var Editor = {
  initialize: function() {
    this.buildControls();
    Slides.appendControls(this.defControls);
  },

  addDefinition: function(event) {
    var elWord = build("span", {className: "word"}),
        definition = this.defInput.value;
    NodeChirurgeon.wrapSelection(elWord, document.getSelection());
    Slides.addWord(elWord, definition);
    this.defInput.value = "";
  },

  buildControls: function() {
    this.defButton   = build("button", {
                         id: "add-definition",
                         textContent: "Define",
                         onclick: this.addDefinition.bind(this)
                       });
    this.defInput    = build("input", {
                         id: "write-definition"
                       });
    this.defControls = build("div", {
                         id: "definition-controls",
                         contains: [this.defInput, this.defButton]
                       });
  }
};


/*
 * TooltipManager
 *
 * Given an element and a definition, make a hover popup for the element.
 *
 * By passing true to Element.addEventListener(), we cause element to listen
 * in "capture" mode, which means the callback will be triggered as the event
 * descends down the hierarchy rather than on its way back up.
 *
 * console.log(generateMessage(data));  |  1  <- firstCaughtBy
 *             generateMessage(data)    |  2
 *                             data     V  3
 *
 * This allows us to generate tooltips in order "on the way down", without
 * ever having to keep track of the tooltips ourselves.
 *
 **/

var TooltipManager = {
  element: null,
  active: null,

  initialize: function() {
    this.element = document.getElementById("tooltip");
  },

  watch: function(element, definition) {
    element.addEventListener("mouseover", (event) => {
      if(!event.firstCaughtBy) { event.firstCaughtBy = element; }
      this.push(element, definition, event.firstCaughtBy);
    }, true);

    element.addEventListener("mouseout", (event) => {
      this.pop(element);
    }, true);
  },

  push: function(element, definition, elOuter) {
    this.element.appendChild(
      this.build(
        AlignedWord.buildElement(element, elOuter),
        definition
      )
    );
    this.setActive(element);
  },

  pop: function(element) {
    this.element.removeChild(this.element.lastChild);
    this.setActive(null);
  },

  setActive: function(element) {
    if(this.active) { this.active.classList.remove("active"); }
    if(element) {
      this.active = element;
      element.classList.add("active");
    } else {
      this.active = null;
    }
  },

  build: function(elWord, definition) {
    return build("div", {
      className: "tooltip",
      contains: [
        build("div", {className: "word", contains: [elWord]}),
        build("div", {className: "definition", text: definition})
      ]
    })
  }
};


/*
 * AlignedWord
 *
 * Creates horizontally aligned nested Tooltips by reproducing their entire
 * node tree ancestry. For example:
 *
 * ACTUAL TOOLTIP CONTENTS:
 *
 * console.log(generateMessage(data));    <-- outer
 * console.log(generateMessage(data));
 * console.log(generateMessage(data));    <-- target
 *
 * But each Word gets its own element, and we can use color: transparent
 * to hide the text of ancestors in the Tooltip for a given Word, so the
 * Tooltips end up looking like this:
 *
 * APPARENT TOOLTIP CONTENTS:
 *
 * console.log(generateMessage(data));    <-- outer
 *             generateMessage(data)
 *                             data       <-- target
 **/

var AlignedWord = {
  buildElement: function(target, outer) {
    return deepCopy(outer, function(copy, original) {
      if(original === target) {
        copy.className += " shown";
      }
    });
  }
};

function deepCopy(original, editClone) {
  // copy classes, IDs, but not child text or elements
  var copy = original.cloneNode();
  editClone(copy, original);
  original.childNodes.forEach(function(child) {
    copy.appendChild(deepCopy(child, editClone));
  });
  return copy;
}


/*
 * NodeChirurgeon
 *
 * Divide, extract, enclose, and transplant nodes with surgical accuracy.
 *
 * Given the following selection on a <p> with one text node child,
 * and a wrapper <span></span>:
 *                  ___________
 * <p> "console.log(myAdminCred);" </p>
 *
 * The Chirurgeon will produce:
 *
 * <p>
 *     "console.log("
 *     <span>
 *         "myAdminCred"
 *     </span>
 *     ");"
 * </p>
 *
 **/

var NodeChirurgeon = {
  wrapSelection: function(wrapper, selection) {
    var [start, end] = Scalpel.makeBoundaryIncisions(selection);
    Suture.transplantNodes(wrapper, start, end);
  }
};

var Scalpel = {
  makeBoundaryIncisions: function(selection) {
    var start = this.cut(selection.anchorNode, selection.anchorOffset),
        end   = this.cut(selection.focusNode, selection.focusOffset);
    if(this.userDraggedRightToLeft(start, end)) {
      return [end, start];
    } else {
      return [start, end];
    }
  },

  cut: function(node, cutIndex) {
    if(cutIndex > 0 && cutIndex < node.length) {
      // selected in the middle: Hello[, world!]
      return node.splitText(cutIndex);
    } else {
      // selected at a boundary: [Hello, world!]
      return node;
    }
  },

  userDraggedRightToLeft: function(a, b) {
    // http://stackoverflow.com/a/23512678/16034
    return a.compareDocumentPosition(b) === Node.DOCUMENT_POSITION_PRECEDING;
  }
};

var Suture = {
  transplantNodes: function(newParent, start, end) {
    // Insert the new parent first, before we mess with the DOM.
    start.parentNode.insertBefore(newParent, start);
    // Transplant all siblings between start & end to the new parent.
    this.walkSiblings(start, end, (node) => newParent.appendChild(node));
  },

  walkSiblings: function(start, end, callback) {
    var cache, cursor = start;
    do {
      // cache the next sibling, since we're expecting to move
      // the cursor node around within the DOM hierarchy
      cache = cursor.nextSibling;
      callback(cursor);
      cursor = cache;
    } while (cursor != end);
  }
};


/*
 * AJAX
 *
 **/

function ajax(url, data){
  var xhr = new XMLHttpRequest();
  xhr.onReadyStateChange = function() {
    if(xhr.readyState === XMLHttpRequest.DONE) {
      if(xhr.status === 200) {
        var data = JSON.parse(xhr.responseText);
        console.log(data);
      }
    }
  }
  xhr.open('POST', url, true);
  xhr.send(JSON.stringify(data));
}
