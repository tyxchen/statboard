/* jshint esversion:6 */
(function() {
  
  "use strict";

  const DB_NAME = "statboard-test9";
  const DB_UNIQ_KEY = "num";
  
  const stats = ["AB", "BIP", "OB", "2B", "3B", "HR", "K", "FTO", "GO", "PO", "LO", "PFO", "GIDP", "GIFO", "HCn", "HCp", "FO", "Fp", "GBFA", "GBFS", "GBFp", "FFA", "FFS", "FFp", "OGS", "DGS"];
  const indexes = ["num", "name", "position", "batting"];
  const searchableIndexes = ["num", "name", "AB", "BIP", "K", "GO", "PO", "LO", "PFO", "HCp", "Fp", "GBFp", "FFp", "OGS", "DGS"]; // length <= 16
  
  const statDefs = {
    AB: "At Bats",
    BIP: "Balls in Play",
    OB: "On Base",
    "2B": "Doubles",
    "3B": "Triples",
    HR: "Home Runs",
    K: "Strikeouts",
    FTO: "Foul-tip Outs",
    GO: "Groundouts",
    PO: "Popouts",
    LO: "Lineouts",
    PFO: "Pop-fly Outs",
    GIDP: "Grounded into Double Plays",
    GIFO: "Grounded into Force Outs",
    HCn: "Hard Contact times",
    HCp: "Hard Contact %",
    FO: "Force Outs",
    Fp: "Fielding %",
    GBFA: "Groundball Fielding Attempts",
    GBFS: "Groundball Fielding Successes",
    GBFp: "Groundball Fielding %",
    FFA: "Flyball Fielding Attempts",
    FFS: "Flyball Fielding Successes",
    FFp: "Flyball Fielding %",
    OGS: "Offensive Game Score",
    DGS: "Defensive Game Score"
  };
  
  var DB = {
    getCurrentGame: function(db) {
      return localStorage.getItem("DB_" + db + "_CURRENT_GAME");
    },
    updateCurrentGame: function(db, game) {
      localStorage.setItem("DB_" + db + "_CURRENT_GAME", game.toString());
    },
    getSchema: function(db, verno) {
      return JSON.parse(localStorage.getItem("DB_" + db + "_" + verno + "_SCHEMA"));
    },
    updateSchema: function(db, verno, schema) {
      localStorage.setItem("DB_" + db + "_" + verno + "_SCHEMA", JSON.stringify(schema));
    },
    getVersion: function(db) {
      return parseInt(localStorage.getItem("DB_" + db + "_VERSION")) || 1;
    },
    updateVersion: function(db, verno) {
      localStorage.setItem("DB_" + db + "_VERSION", verno.toString());
    }
  };
  
  var DB_VERSION = DB.getVersion(DB_NAME);
  var dbErr = function(err) {
    console.error("DB open failed: " + err);
  };

  var APP = {};
  
  APP.GAMES = function() {
    console.log(DB_VERSION);
    var db = new Dexie(DB_NAME); //DB(DB_NAME, DB_VERSION, ["test"], DB_UNIQ_KEY, indexes);
    var currentGame;
    var currentGameView = {};

    var editRow = function(id) {
      var modal = $("#games-stats-table-edit"),
          header = ["<thead><tr>"],
          body = ["<tbody><tr>"],
          player = {};

      $("#games-stats-table-edit .mode").text(id === undefined ? "Create" : "Edit");
      $("#games-stats-table-edit .game-id").text(currentGame);
      
      if (id !== undefined) {
        modal.data("player-id", id);
        $("#games-stats-table-edit-delete").show();
        player = currentGameView[id];
      } else {
        modal.data("player-id", "");
        $("#games-stats-table-edit-delete").hide();
      }

      for (let i of indexes) {
        $("#games-stats-table-edit [data-field='" + i + "']").val(id === undefined ? "" : player[i]);
      }
      for (let s of stats) {
        // ignore dynamically generated properties
        if (s !== "HCp" && s !== "Fp" && s !== "GBFp" && s !== "FFp") {
          header.push("<th style='min-width:60px'><abbr title='" + statDefs[s] + "'>" + s + "</abbr></th>");

          body.push("<td><input type='number' data-field='" + s + "' value='" + (id === undefined ? "0" : player[s]) + "'></td>");
        }
      }
      
      header.push("</tr></thead>");
      body.push("</tr></tbody>");
      $("#games-stats-table-edit-stats").html(header.concat(body).join(""));
      
      modal.foundation("open");
    };

    var populateGames = function(games) {
      $("#select-game").html(games.map((g) => "<option value='" + g.code + "'>" + g.code + "</option>").join(""));
      $("#select-game").prepend("<option selected>--</option>");
    };
    
    var sortTable = function(table, key, dir) {
      return table.sort(function(a, b) {
        if (!isNaN(a[key]) && !isNaN(b[key])) {
          return dir * (a[key] - b[key]);
        }
        return dir * (a[key] >= b[key] ? 1 : -1);
      });
    };
    
    var loadTable = function(players) {
      var builder = ["<thead><tr>"],
          sortKey = $("#games-stats-table").data("sort-key") || "batting",
          sortDir = $("#games-stats-table").data("sort-dir");
          
      sortDir = (sortDir !== undefined && sortDir !== null ? sortDir : 1);
      
      if (!Array.isArray(players)) {
        players = Object.keys(players).map((k) => players[k]);
      }
      players = sortTable(players, sortKey, sortDir);

      for (let ind of indexes.concat(stats)) {
        let name = ind;

        if (indexes.indexOf(name) !== -1) {
          name = name[0].toUpperCase() + name.slice(1);
          
          if (name.length > 4) {
            name = name.slice(0, 3) + ".";
          }
        }

        if (["HCn", "GBFA", "GBFS", "FFA", "FFS"].indexOf(ind) === -1) {
          if (ind === sortKey) {
            builder.push("<th data-name='" + ind + "' data-sort-dir='" + sortDir + "'>");
          } else {
            builder.push("<th data-name='" + ind + "'>");
          }

          if (stats.indexOf(ind) !== -1) {
            builder.push("<abbr title='" + statDefs[ind] + "'>" + (name.slice(-1) === "p" ? name.slice(0, -1) + "%" : name) + "</abbr>");
          } else {
            builder.push(name);
          }
          builder.push("</th>");
        }
      }

      builder.push("</tr></thead><tbody>");

      for (let p of players) {
        builder.push("<tr data-player-id='" + p.id + "'>");
        
        for (let s of stats) {
          p[s] = parseInt(p[s]);
        }
        
        for (let k of indexes.concat(stats)) {
          switch (k) {
          case "HCn":
          case "GBFA":
          case "GBFS":
          case "FFA":
          case "FFS":
            continue;
          case "HCp":
          case "Fp":
          case "GBFp":
          case "FFp":
            builder.push("<td data-field='" + k + "'>" + p[k] + "%</td>");
            break;
          default:
            builder.push("<td data-field='" + k + "'>" + p[k] + "</td>");
          }
        }
        builder.push("</tr>");
      }
      
      builder.push("<tr id='games-stats-table-new-player'><td colspan='" + indexes.concat(stats).length + "'>+ Add a new player</td></tr>");
      builder.push("</tbody>");
      
      $("#games-stats-table").html(builder.join(""));
    };
    
    var loadGame = function(game) {
      var players = [],
          builder = ["<thead><tr>"];
      
      return db.transaction("r", db[game], function() {
        console.log("Game '%s' selected.", game);
        db[game].toArray(function(p) {
          players = p;
        });
      }).then(function() {
        loadTable(players);
        
        for (let p of players) {
          currentGameView[p.id] = p;
        }

        $("#games-stats-table").data("game-id", game);
        $("#games-empty-callout").remove();
        
        currentGame = game;
        DB.updateCurrentGame(DB_NAME, currentGame);

        db.games.toArray(populateGames).then(function() {
          $("#select-game").val(game);
        });

        return;
      });
    };


    if (db.tables.length === 0 && db.verno === 0) {
      DB.updateSchema(DB_NAME, 1, {
        games: "code,park,date,time"
      });
    }
    
    for (let v=1;v<=DB_VERSION;v++) {
      db.version(v).stores(DB.getSchema(DB_NAME, v));
    }

    db.version(DB_VERSION);
    db.open().catch(dbErr);
    db.games.toArray(populateGames).then(function() {
      if (!!DB.getCurrentGame(DB_NAME)) {
        loadGame(DB.getCurrentGame(DB_NAME));
      }
    });
    
    console.table(db.tables);

    $("a[href='#']").on("click", function(e) {
      e.preventDefault();
    });

    $("#confirm-action [data-cancel]").on("click", function() {
      $("#confirm-action [data-confirm]").off("click");
      $("#confirm-action .action").text("");
    });

    $("#select-game").on("change", function(e) {
      $(this).children(":not([value])").first().remove();
      loadGame($(this).val()).catch((err) => { console.error(err); });
    });
    
    $("#games-import").on("click", function(e) {
      var text = $("#games-emport-text").val(),
          game = {};
      
      try {
        text = JSON.parse(text);
      } catch (err) {
        console.error("Error parsing JSON: " + err.message);
      }
      
      game[text.game.code] = "++id," + searchableIndexes.join(",");

      console.dir(game);
      db.close();
      db.version(++DB_VERSION).stores(game);
      db.open().then(function() {
        DB.updateVersion(DB_NAME, DB_VERSION);
        DB.updateSchema(DB_NAME, DB_VERSION, game);
        
        console.log("Updated '%s' succesfully to version %d", DB_NAME, DB_VERSION);
      }).catch(dbErr);

      db.transaction("rw", db.games, db[text.game.code], function() {
        db.games.add({
          code: text.game.code,
          park: text.game.park,
          date: text.game.date,
          time: text.game.time
        });
        
        db[text.game.code].bulkAdd(text.body).catch(function (err) {
          console.error(err.failures.length + " entries failed.");
          console.table(err.failures);
        });
        for (let l of text.body) {
          console.dir(l);
        }
        loadGame(text.game.code).catch((err) => { console.error(err); });
      }).then(function() {
        $("#games-emport").foundation("close");
      }).catch(Dexie.OpenFailedError, function (err) {
        alert("Object store with name '" + text.game.code + "' probably already exists. Wanna try renaming that?");
      }).catch((err) => { console.error(err); });
    });

    $("#games-export, #games-export-json").on("click", function(e) {
      var exports = { game: {}, body: [] };
      
      db.transaction("r", db.games, db[currentGame], function() {
        db.games.get(currentGame).then(function(game) {
          exports.game = jQuery.extend({}, game);
        });
        db[currentGame].toArray(function(a) {
          exports.body = a;
        });
      }).then(function() {
        $("#games-emport-text").val(JSON.stringify(exports));
        $("#games-export-json").removeClass("hollow");
        $("#games-export-csv").addClass("hollow");
        $("#games-emport").foundation("open");
      }).catch((err) => { console.error(err); });
    });
    
    $("#games-export-csv").on("click", function(e) {
      var exports = { game: {}, body: {} };
      
      db.transaction("r", db.games, db[currentGame], function() {
        db.games.get(currentGame).then(function(game) {
          exports.game = jQuery.extend({}, game);
        });
        db[currentGame].each(function(a) {
          for (let i of Object.keys(a)) {
            if (exports.body[i] === undefined) {
              exports.body[i] = [];
            }
            exports.body[i].push(a[i]);
          }
        });
      }).then(function() {
        var builder = [],
            gameKeys = Object.keys(exports.game),
            bodyKeys = Object.keys(exports.body);

        builder.push(gameKeys.join(","));
        builder.push(gameKeys.map((k) => exports.game[k]).join(","));
        builder.push("\n");
        builder.push(bodyKeys.join(","));
        for (let i=0;i<exports.body.id.length;i++) {
          builder.push(bodyKeys.map((m) => exports.body[m][i]).join(",")); // jshint ignore:line
        }

        $("#games-emport-text").val(builder.join("\n"));
        $("#games-export-csv").removeClass("hollow");
        $("#games-export-json").addClass("hollow");
        $("#games-emport").foundation("open");
      }).catch((err) => { console.error(err); });
      
    });
    
    $("#games-delete").on("click", function(e) {
      var store = {};
      store[currentGame] = null;
      
      $("#confirm-action [data-action='confirm']").on("click", function() {
        db.close();
        db.version(++DB_VERSION).stores(store);
        db.open().then(function() {
          db.transaction("rw", db.games, function() {
            db.games.delete(currentGame);
          }).then(function() {
            DB.updateVersion(DB_NAME, DB_VERSION);
            DB.updateSchema(DB_NAME, DB_VERSION, store);
            
            console.log("Updated '%s' succesfully to version %d", DB_NAME, DB_VERSION);
            
            window.location.reload();
          }).catch((err) => { console.error(err); });
        }).catch(dbErr);
      });
      
      $("#confirm-action .action").text("delete game " + currentGame);
      $("#confirm-action").foundation("open");
    });
    
    $("#games-stats-table").on("click", function(e) {
      if (!!e.target) {
        if (!$(this).hasClass("editing")) {
          let $t = $(e.target);
          
          e.stopPropagation();
          
          if ($t.is("[data-field]")) {
            editRow($t.closest("tr").data("player-id"));
            $("#games-stats-table-edit [data-field='" + $t.data("field") + "']").trigger("focus").trigger("select");
          } else if ($t.is("#games-stats-table-new-player td")) {
            editRow();
          } else if ($t.is("abbr,th")) {
            let sortKey = $t.closest("th").data("name"),
                sortDir = parseInt($("#games-stats-table").data("sort-dir")) || 1;
            
            $("#games-stats-table").data("sort-key", sortKey);
            $("#games-stats-table").data("sort-dir", -sortDir);
            loadTable(currentGameView);
            $("th[data-name='" + sortKey + "']").attr("data-sort-dir", -sortDir);
          }
        } else {
          $(e.target).trigger("select");
        }
      }
    });
    
    $(".games-stats-table").on("keydown", function(e) {
      var t = e.target;

      if ($(this).hasClass("editing") && !!t && t.hasAttribute("data-field")) {
        switch (e.which) {
        case 37:
        case 39:
          e.preventDefault();
          let $el = e.which === 37 ? $(t).parent().prev() : $(t).parent().next();
          $el.children("[data-field]").trigger("focus").trigger("select");
          break;
        case 38:
        case 40:
          e.preventDefault();
          if (e.ctrlKey) {
            let v = parseInt($(t).val());
            $(t).val(v + (39 - e.which)).trigger("select");
          } else {
            let $el = e.which === 38 ? $(t).closest("tr").prev() : $(t).closest("tr").next();
            $el.find("[data-field='" + t.getAttribute("data-field") + "']").trigger("focus").trigger("select");
          }
          break;
        case 13:
          e.preventDefault();
          break;
        }
      }
    });
    
    $("#games-stats-table").on("keydown", function(e) {
      var t = e.target;

      if ($(this).hasClass("editing") && !!t && t.hasAttribute("data-field")) {
        switch (e.which) {
        case 13:
          e.preventDefault();
          if (e.ctrlKey) {
            $("#games-stats-table-bulk [data-action='save']").trigger("click");
          } else {
            $(t).closest("tr").next().find("[data-field='" + t.getAttribute("data-field") + "']").trigger("focus").trigger("select");
          }
          break;
        case 27:
          e.preventDefault();
          $("#games-stats-table-bulk [data-action='edit']").trigger("click");
          break;
        }
      }
    });
    
    $("#games-stats-table-edit-delete").on("click", function(e) {
      db.transaction("rw", db[currentGame], function() {
        db[currentGame].delete($("#games-stats-table-edit").data("player-id"));
      }).then(function() {
        delete currentGameView[$("#games-stats-table-edit").data("player-id")];
        loadTable(currentGameView);
        $("#games-stats-table-edit").foundation("close");
      });
    });

    $("#games-stats-table-edit-submit").on("click", function(e) {
      var player = {},
          game = currentGame;

      db.transaction("rw", db[game], function() {
        $("[data-field]").each(function(i, e) {
          var field = $(e).data("field"),
              val = $(e).val();
          
          switch (field) {
          // case "batting":
            // let oldPos = 1;
            // db[game].where("batting")
            //   .below(val)
            //   .each(function (player) {
            //     // TODO: transaction
            //     player.batting =
            //   });
          case 'shared':
            break;
          default:
            player[field] = val;
          }
        });
        
        if ($("#games-stats-table-edit").data("player-id") !== undefined && $("#games-stats-table-edit").data("player-id") !== "") {
          player.id = $("#games-stats-table-edit").data("player-id");
        }
        
        player.HCp = (parseInt(player.HCn) / parseInt(player.BIP) * 100).toFixed(1);
        player.GBFp = (parseInt(player.GBFS) / parseInt(player.GBFA) * 100).toFixed(1);
        player.FFp = (parseInt(player.FFS) / parseInt(player.FFA) * 100).toFixed(1);
        player.Fp = ((parseInt(player.GBFp) + parseInt(player.FFp)) / 2).toFixed(1);
        
        db[game].put(player);
      }).then(function() {
        loadGame(game).then(function() {
          $("#games-stats-table-edit").foundation("close");
        }).catch((err) => { console.error(err); });
      });
    });
    
    $("#games-stats-table-bulk .button").on("click", function(e) {
      var action = $(this).data("action"),
          table = $("#games-stats-table"),
          _this = this;
      
      if (action === "edit" && !table.hasClass("editing")) {
        let header = [],
            body = [];

        for (let i of indexes) {
          i = i[0].toUpperCase() + i.slice(1);
          
          if (i.length > 4) {
            i = i.slice(0, 3) + ".";
          }
          
          header.push("<th>" + i + "</th>");
        }
        for (let s of stats) {
          // ignore dynamically generated properties
          if (s !== "HCp" && s !== "Fp" && s !== "GBFp" && s !== "FFp") {
            header.push("<th style='min-width:60px'><abbr title='" + statDefs[s] + "'>" + s + "</abbr></th>");
          }
        }
        
        table.find("[data-player-id]").each(function(i, e) {
          var p = currentGameView[this.getAttribute("data-player-id")];
          
          body.push("<tr data-player-id='" + this.getAttribute("data-player-id") + "'>");
          for (let i of indexes) {
            body.push("<td>" + p[i] + "</td>");
          }
          for (let s of stats) {
            // ignore dynamically generated properties
            if (s !== "HCp" && s !== "Fp" && s !== "GBFp" && s !== "FFp") {
              body.push("<td><input type='number' data-field='" + s + "' value='" + p[s] + "'></td>");
            }
          }
          body.push("</tr>");
        });
        
        table.children("thead").html("<tr>" + header.join("") + "</tr>");
        table.children("tbody").html(body.join(""));
        table.addClass("editing");
        $(this).text("Cancel");
        $(this).next().show();
      } else if (action === "edit" && table.hasClass("editing")) {
        loadTable(currentGameView); // reset to unsaved
        table.removeClass("editing");
        $(_this).text("Edit");
        $(_this).next().hide();
      } else if (action === "save" && table.hasClass("editing")) {
        let players = [];

        table.find("[data-player-id]").each(function(i, e) {
          let player = currentGameView[this.getAttribute("data-player-id")];

          $(this).find("[data-field]").each(function(ii, ee) {
            player[this.getAttribute("data-field")] = this.value;
          });
          
          player.HCp = (parseInt(player.HCn) / parseInt(player.BIP) * 100).toFixed(1);
          player.GBFp = (parseInt(player.GBFS) / parseInt(player.GBFA) * 100).toFixed(1);
          player.FFp = (parseInt(player.FFS) / parseInt(player.FFA) * 100).toFixed(1);
          player.Fp = ((parseInt(player.GBFp) + parseInt(player.FFp)) / 2).toFixed(1);
          
          players.push(player);
        });
        
        console.dir(players);
        // db.transaction("rw", db[currentGame], function() {
          db[currentGame].bulkPut(players).catch(function (err) {
            console.error(err.failures.length + " entries failed.");
            console.table(err.failures);
          });
        // }).then(function() {
          loadGame(currentGame).then(function() {
            table.removeClass("editing");
            $(_this).prev().text("Edit");
            $(_this).hide();
          }).catch((err) => { console.error(err); });
        // }).catch((err) => { console.error(err); });
      }
    });

    $("#games-create-new-add").on("click", function(e) {
      var $p = $(this).prev(),
          c = parseInt($p.children().last().data("c")) + 1 || 0;
      $p.append([
        "<div class='expanded row' id='games-create-new-" + c + "' data-c='" + c + "'>",
          "<div class='medium-6 small-4 columns'>",
            "<input type='text' id='games-create-new-" + c + "-name' placeholder='Cherry Ten'>",
          "</div>",
          "<div class='medium-2 small-3 columns'>",
            "<input type='number' id='games-create-new-" + c + "-num' min='00' max='99' placeholder='00'>",
          "</div>",
          "<div class='medium-2 small-3 columns'>",
            "<select id='games-create-new-" + c + "-position' onchange='$(this).children(\":not([value])\").remove()'>",
              "<option>--</option>",
              "<option value='BC'>BC</option>",
              "<option value='1B'>1B</option>",
              "<option value='2B'>2B</option>",
              "<option value='3B'>3B</option>",
              "<option value='SS'>SS</option>",
              "<option value='LF'>LF</option>",
              "<option value='LR'>LR</option>",
              "<option value='CF'>CF</option>",
              "<option value='RF'>RF</option>",
              "<option value='RR'>RR</option>",
            "</select>",
          "</div>",
          "<div class='small-1 columns'>",
            "<span class='button hollow alert games-create-new-remove-player'><i class='fi-trash'></i></span>",
          "</div>",
        "</div>"
      ].join(""));
      $("#games-create-new-" + c + "-name").trigger("focus");
    });

    $("#games-create-new .expanded.row").on("click", function(e) {
      if (!!e.target && ($(e.target).is(".games-create-new-remove-player") || $(e.target).parent().is(".games-create-new-remove-player"))) {
        e.stopPropagation();
        $(e.target).closest(".expanded.row").remove();
      }
    });
    
    $("#games-create-new-submit").on("click", function(e) {
      var code = $("#games-create-new-code").val(),
          park = $("#games-create-new-park").val(),
          date = $("#games-create-new-date").val(),
          time = $("#games-create-new-time").val(),
          lineup = [],
          game = {};

      if (/[JKPX]\d{2}[JKPX]?\d{2}/.test(code)) { // TODO: impl. validation
        db.close();
  
        game[code] = "++id," + searchableIndexes.join(",");

        $("[data-c]").each(function(i, e) {
          var player = {},
              c = $(e).data("c");
          player.num =  $("[id$='" + c + "-num']").val();
          player.name = $("[id$='" + c + "-name']").val();
          player.position = $("[id$='" + c + "-position']").val();
          player.batting = i+1;
          for (let s of stats) {
            player[s] = 0;
          }
          lineup.push(player);
        });
        
        console.dir(game);
        db.version(++DB_VERSION).stores(game);
        db.open().then(function() {
          DB.updateVersion(DB_NAME, DB_VERSION);
          DB.updateSchema(DB_NAME, DB_VERSION, game);
          
          console.log("Updated '%s' succesfully to version %d", DB_NAME, DB_VERSION);
        }).catch(dbErr);

        db.transaction("rw", db.games, db[code], function() {
          db.games.add({
            code: code,
            park: park,
            date: date,
            time: time
          });
          
          db[code].bulkAdd(lineup).catch(function (err) {
            console.error(err.failures.length + " entries failed.");
            console.table(err.failures);
          });
          for (let l of lineup) {
            console.dir(l);
          }
          loadGame(code).catch((err) => { console.error(err); });
        }).then(function() {
          $("#games-create-new").foundation("close");
        }).catch(function (err) {
          console.error(err);
        });
      }
    });
  };
  
  $(document).foundation();
  APP.GAMES();
  setTimeout(() => {
    $("#loading").fadeOut();
  }, 1000);
})();
