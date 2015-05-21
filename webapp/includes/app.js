$(function() {

    var $contentContainer = $('.content-container');

    function resizeVertical() {
        $contentContainer.height($(window).height() - $contentContainer.offset().top - 4);
    }

    SlideTex.Layout = {
        init: function() {
            $(window).resize(function resizeWindowEventHandler() {
                resizeVertical();
            });
            resizeVertical();
            $('.ui-tooltip').tooltip();
        }
    };
});;
$(function() {

	// Variable to store your files
	var files;

	var $uploadInput = $('input[type=file]#graphicUpload');
	var $imagesList = $('.ui-images-list');
	var $imagesContainer = $('.ui-images-container');
	var $imagesModal = $('#addImageModal');


	function getImageFigureCode(fileName) {
		return '\\begin{figure}\n' +
			' \\includegraphics[width=\\textwidth,height=\\textheight,keepaspectratio]{'+ fileName +'}\n' +
			' \\caption{Die Abbildung zeigt ein Beispielbild}\n' +
			'\\end{figure}\n' ;
	}

	function showImage(fileName) {

		var imageThumbDom = $('<div class="col-sm-6 col-md-4"> <div class="thumbnail"><img src="output/'+fileName+'" data-dismiss="modal"><div class="caption">' +
			'<p>'+fileName+'</p></div></div></div>');

		$imagesContainer.append(imageThumbDom);
		$imagesList.slideDown();

		imageThumbDom.click(function() {
			SlideTex.Writer.editor.insert(getImageFigureCode(fileName));
		});
		SlideTex.Writer.editor.insert(getImageFigureCode(fileName));
		$imagesModal.modal('hide');
	}


	// Grab the files and set them to our variable
	function prepareUpload(event) {
		files = event.target.files;
		var data = new FormData();
		$.each(files, function(key, value)
		{
			data.append(key, value);
		});

		$.ajax({
			url: 'upload',
			type: 'POST',
			data: data,
			cache: false,
			dataType: 'json',
			processData: false,
			contentType: false,
			success: function(data, textStatus, jqXHR) {
				console.log(data);
				$uploadInput.replaceWith( $uploadInput = $uploadInput.clone( true ) );
				$uploadInput.show();
				for(var i=0; i< data.length; i++) {
					showImage(data[i].name);
				}
			},
			beforeSend: function( xhr ) {
				$uploadInput.hide();
			}
		});
	}

	SlideTex.Upload = {
		init: function() {
			$uploadInput.on('change', prepareUpload);
		}
	};
});;

$(function() {

    var $compileSlides = $('.ui-compile-slides');
    var $viewContainer = $('.view-container');
    var $frameContainer = $('.frame-container');
    var $errorContainer = $('.error-container');
    var $errorLog = $('.error-content');
    var $compileSlidesAuto = $('.ui-compile-slides-auto');


    function buildData() {
        return JSON.stringify(
            {
                latex: SlideTex.Writer.editor.getValue(),
                name: 'testabc'
            }
        );
    }

    function escapeHtml(text) {
        var map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
            "\n": '<br>'
        };

        return text.replace(/[&<>"'\n]/g, function(m) { return map[m]; }).split(" ").join("&nbsp;");
    }

    function processData(data) {

        // if latex compiling failed
        if(data.error) {
            $viewContainer.addClass('error-present');
            // add error log and scroll down to last line
            $errorLog.html(escapeHtml(data.console));
            $errorContainer.animate({ scrollTop: $errorContainer[0].scrollHeight}, 350);
            return false;
        }

        $viewContainer.removeClass('error-present');
        if(data.name) {
            var viewerUrl = 'viewer.html?file=' + data.name;

            if(localStorage.currentPage) {
                viewerUrl += '#page=' + localStorage.currentPage;
            }
            $frameContainer.find('.frame').remove();

            $frameContainer.prepend('<iframe class="frame" src="'+viewerUrl+'" allowfullscreen webkitallowfullscreen></iframe>');
            return true;
        }
    }

    function compile() {

        $frameContainer.addClass('activity');
        $compileSlides.find('.fa').addClass('fa-spin');


        $.ajax({
            url: 'http://localhost:8080/api',
            method: 'POST',
            contentType: 'application/json',
            data: buildData()
        }).done(function(data, textStatus, jqXHR) {
                processData(data);
                $frameContainer.removeClass('activity');
                $compileSlides.find('.fa').removeClass('fa-spin');
        });
    }

    function attachEventListeners() {
        $compileSlides.click(function() {
            compile();
        });

        // compile when user checked auto
        $compileSlidesAuto.click(function() {
            if($(this).prop('checked')) {
                compile();
            }
        });

        // execute after every key up, compile when auto is checked and user didn't change anything since duration
        $(SlideTex.Writer.editorDomSelector).keyup(function() {
            delay(function(){
                if($compileSlidesAuto.prop('checked')) {
                    compile();
                }
            }, 2500 );
        });

        $(document).keydown(function(event) {
                // If Control or Command key is pressed and the S key is pressed
                // run save function. 83 is the key code for S.
                if((event.ctrlKey || event.metaKey) && event.which == 83) {
                    // Save Function
                    event.preventDefault();

                    compile();
                    return false;
                };
            }
        );
    }

    function appendCompileButtonLabel() {

        var labelSuffix = 'CTRL+S';
        if (navigator.appVersion.indexOf("Win")!=-1) labelSuffix="Windows";
        if (navigator.appVersion.indexOf("Mac")!=-1) labelSuffix="CMD+S";

        $compileSlides.append(' (' + labelSuffix + ')');
    }


    var delay = (function(){
        var timer = 0;
        return function(callback, ms){
            clearTimeout (timer);
            timer = setTimeout(callback, ms);
        };
    })();


    SlideTex.Viewer = {
        init: function() {
            attachEventListeners();
            appendCompileButtonLabel();
        },
        compile: compile
    };
});;
$(function() {
    var $editor = $('.ui-editor');
    var $addSlide = $('.ui-add-slide');
    var $undo = $('.ui-undo');
    var $redo = $('.ui-redo');
    var frameSkeleton = '\\frame{\\frametitle{Mein Titel }\nMein Inhalt\n}\n\n';

    var aceEditor;


    function insertDefaultTemplate() {
        var example = "\\documentclass{beamer} "
            + "\n\\begin{document} "
            + "\n\\title{Simple Beamer Class}    "
            + "\n\\author{Sascha Frank}  "
            + "\n\\date{\\today}  "
            + "\n "
            + "\n\\frame{\\titlepage}  "
            + "\n "
            + "\n "
            + "\n\\frame{\\frametitle{Title}  "
            + "\nEach frame should have a title. "
            + "\n} "
            + "\n "
            + "\n "
            + "\n\\end{document} ";

        $editor.append(example);
    }

    function calculateAmountOfFrames() {
        return (aceEditor.getSession().getValue().match(/\\frame{/g) || []).length;
    }


    function attachEventListeners() {

        $addSlide.click(function addSlideEvent() {

            var code = aceEditor.getSession().getValue();

            var withoutEnd = code.substr(0, code.indexOf('\\end{document}'));

            var linesWithoutEnd = withoutEnd.split(/\r*\n/);

            aceEditor.getSession().insert({row:linesWithoutEnd.length - 1, column: 0}, frameSkeleton);


            //code = code.insertAt(code.indexOf('\\end{document}'),frameSkeleton);

            //aceEditor.getSession().setValue(code);

            // update current Page
            localStorage.currentPage = calculateAmountOfFrames();

            // compile
            SlideTex.Viewer.compile();
        });

        $undo.click(function undoEvent() {
            aceEditor.getSession().getUndoManager().undo();
        });

        $redo.click(function redoEvent() {
            aceEditor.getSession().getUndoManager().redo();
        });

        aceEditor.getSession().on('change', function editorChangeEvent() {

            var undoManager = aceEditor.getSession().getUndoManager();

            setTimeout(function() {
                if(undoManager.hasUndo()) {
                    $undo.removeAttr('disabled');
                }else{
                    $undo.attr('disabled', 'disabled');
                }
                if(undoManager.hasRedo()) {
                    $redo.removeAttr('disabled');
                }else{
                    $redo.attr('disabled', 'disabled');
                }
            }, 100);


        });
    }

    function setValue(text) {
        aceEditor.getSession().setValue(text);
    }

    function getValue() {
        return aceEditor.getSession().getValue();
    }

    function initeditor() {
        aceEditor = ace.edit("editor");
        aceEditor.setTheme("ace/theme/textmate");
        aceEditor.getSession().setMode("ace/mode/latex");
    }

    SlideTex.Writer = {
        init: function() {
            initeditor();
            attachEventListeners();
            //insertDefaultTemplate();
            SlideTex.Writer.editor = aceEditor;

        },
        editor: null,
        editorDomSelector: '#editor'
    };
});;var SlideTex = {};

String.prototype.insertAt=function(index, string) {
    return this.substr(0, index) + string + this.substr(index);
};;$(function() {

    $( document ).ready(function() {
        SlideTex.Writer.init();
        SlideTex.Layout.init();
        SlideTex.Viewer.init();
		SlideTex.Upload.init();
    });
});

