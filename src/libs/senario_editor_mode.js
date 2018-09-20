var ace = require('brace');

ace.define('ace/mode/senario_editor', function (require, exports, module) {

  var oop = require("ace/lib/oop");
  var TextMode = require("ace/mode/text").Mode;
  var ScenarioEditorHighlightRules = require("ace/mode/senario_editor_highlight_rules").ScenarioEditorHighlightRules;

  var Mode = function () {
    this.HighlightRules = ScenarioEditorHighlightRules;
  };
  oop.inherits(Mode, TextMode);

  (function () {
    // Extra logic goes here. (see below)
  }).call(Mode.prototype);

  exports.Mode = Mode;
});

ace.define('ace/mode/senario_editor_highlight_rules', function (require, exports, module) {

  var oop = require("ace/lib/oop");
  var TextHighlightRules = require("ace/mode/text_highlight_rules").TextHighlightRules;

  var ScenarioEditorHighlightRules = function () {
    this.$rules = {
      "start": [
        {
          token: "empty_line",
          regex: "^$",
        },
        {
          token: "comment",
          regex: "^\\/\\/.*$"
        },
        {
          token: "comment", // multi line comment
          regex: "\\/\\*",
          next: "comment"
        },
        {
          token: "constant.numeric",
          regex: "^\\/.*$"
        },
        {
          token: "keyword",
          regex: "^\\:.*$"
        },
        {
          defaultToken: "text",
        },
      ],
      "comment": [
        {
          token: "comment", // closing comment
          regex: "\\*\\/",
          next: "start"
        }, {
          defaultToken: "comment"
        }
      ],
    }
  }

  oop.inherits(ScenarioEditorHighlightRules, TextHighlightRules);

  exports.ScenarioEditorHighlightRules = ScenarioEditorHighlightRules;
});
