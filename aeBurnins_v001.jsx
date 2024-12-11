/**
 * Burnin Manager Script for Adobe After Effects
 * 
 * This script provides a UI panel with "Add Burnins" and "Remove Burnins" buttons.
 * 
 * - **Add Burnins**:
 *   - Increases the composition height by a specified number of pixels (`burninHeight`).
 *   - Adds a black solid at the bottom with the height defined by `burninHeight`.
 *   - Adds two text layers:
 *     - "4TokenNameWithNesting-Frame-TC" with a left-aligned paragraph and positioned `leftMargin` px from the left.
 *     - "2TokenNameNoNesting-Coloring" with a right-aligned paragraph and positioned `rightMargin` px from the right.
 * 
 * - **Remove Burnins**:
 *   - Restores the original composition height.
 *   - Removes the black solid and both text layers.
 * 
 * **Usage**:
 * - Open Adobe After Effects.
 * - Open or create a composition.
 * - Run this script via `File > Scripts > Run Script File...` and select this .jsx file.
 */

(function () {
    function burninManager(thisObj) {
        /**
         * ===== Configuration Parameters =====
         * Modify these variables to adjust the burn-in settings.
         */
        var config = {
            fontType: "Roboto-Medium",      // Font type for text layers
            fontSize: 30,                   // Font size for text layers
            burninHeight: 50,              // Height of the burn-in area in pixels
            leftMargin: 20,                 // Left margin for the left-aligned text in pixels
            rightMargin: 20                 // Right margin for the right-aligned text in pixels
        };
        /** ===================================== */

        function buildUI(thisObj) {
            var myPanel = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Burnin Manager", undefined, { resizeable: true });

            var res = "group{orientation:'column', alignment:['fill','top'], \
                addBtn: Button{text:'Add Burnins'}, \
                removeBtn: Button{text:'Remove Burnins'}, \
            }";

            myPanel.grp = myPanel.add(res);

            myPanel.grp.addBtn.onClick = addBurnins;
            myPanel.grp.removeBtn.onClick = removeBurnins;

            myPanel.layout.layout(true);
            return myPanel;
        }

        var myScriptPal = buildUI(thisObj);

        if (myScriptPal instanceof Window) {
            myScriptPal.center();
            myScriptPal.show();
        } else {
            myScriptPal.layout.layout(true);
        }

        // Function to read expression from a given file path
        function readExpressionFromFile(filePath) {
            var exprFile = new File(filePath);
            var expr = "";
            
            if (exprFile.exists) {
                if (exprFile.open("r")) { // Open the file for reading
                    expr = exprFile.read(); // Read the entire content
                    exprFile.close(); // Close the file
                } else {
                    alert("Unable to open the expression file:\n" + filePath);
                }
            } else {
                alert("Expression file does not exist:\n" + filePath);
            }
            
            return expr;
        }

        function addBurnins() {
            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) {
                alert("Please select an active composition.");
                return;
            }

            // Prevent multiple additions
            var burninFlag = comp.layer("BurninsFlag");
            if (burninFlag) {
                alert("Burnins have already been added.");
                return;
            }

            app.beginUndoGroup("Add Burnins");

            try {
                // Store original composition height
                var originalHeight = comp.height;

                // Increase composition height by burninHeight pixels
                comp.height += config.burninHeight;

                // Create a null layer as a flag to track burnins
                var flagLayer = comp.layers.addNull();
                flagLayer.name = "BurninsFlag";
                flagLayer.enabled = false; // Make it invisible

                // Add a marker to store the original height
                var marker = new MarkerValue("OriginalHeight:" + originalHeight);
                flagLayer.property("Marker").setValueAtTime(0, marker);

                // Create a black solid with burninHeight pixels height, aligned to the bottom
                var blackSolid = comp.layers.addSolid([0, 0, 0], "BurninBackground", comp.width, config.burninHeight, 1.0);
                blackSolid.name = "BurninBackground";
                // Position the black solid at the bottom
                blackSolid.property("Transform").property("Position").setValue([
                    comp.width / 2,
                    originalHeight + (config.burninHeight / 2) // Position based on original height
                ]);

                // Add two text layers
                var textLayerLeft = comp.layers.addText("4TokenNameWithNesting-Frame-TC");
                textLayerLeft.name = "4TokenNameWithNesting-Frame-TC";
                var textLayerRight = comp.layers.addText("2TokenNameNoNesting-Coloring");
                textLayerRight.name = "2TokenNameNoNesting-Coloring";

                // Function to set text properties and anchor point
                function setTextProperties(textLayer, textString, justification) {
                    var textProp = textLayer.property("Source Text");
                    var textDocument = textProp.value;
                    textDocument.font = config.fontType; // Use fontType from config
                    textDocument.fontSize = config.fontSize; // Use fontSize from config
                    textDocument.justification = justification;
                    textDocument.fillColor = [1, 1, 1]; // White color
                    textDocument.applyFill = true;
                    textProp.setValue(textDocument);

                    // Set anchor point based on justification
                    var sourceRect = textLayer.sourceRectAtTime(0, false);
                    var anchorPointX;
                    if (justification === ParagraphJustification.LEFT_JUSTIFY) {
                        anchorPointX = sourceRect.left;
                    } else if (justification === ParagraphJustification.RIGHT_JUSTIFY) {
                        anchorPointX = sourceRect.left + sourceRect.width;
                    } else {
                        anchorPointX = sourceRect.left + sourceRect.width / 2;
                    }
                    var anchorPointY = sourceRect.top + sourceRect.height / 2;
                    textLayer.property("Transform").property("Anchor Point").setValue([anchorPointX, anchorPointY]);
                }

                // Set properties for both text layers
                setTextProperties(textLayerLeft, "4TokenNameWithNesting-Frame-TC", ParagraphJustification.LEFT_JUSTIFY);
                setTextProperties(textLayerRight, "2TokenNameNoNesting-Coloring", ParagraphJustification.RIGHT_JUSTIFY);

                // Calculate horizontal positions
                var centerY = originalHeight + (config.burninHeight / 2); // Center of the black solid

                // Position left text: `leftMargin` px from the left
                // Since anchor point is at the left edge, set X to leftMargin
                var leftX = config.leftMargin;
                textLayerLeft.property("Transform").property("Position").setValue([
                    leftX,
                    centerY
                ]);

                // Position right text: `rightMargin` px from the right
                // Since anchor point is at the right edge, set X to comp.width - rightMargin
                var rightX = comp.width - config.rightMargin;
                textLayerRight.property("Transform").property("Position").setValue([
                    rightX,
                    centerY
                ]);

                // Ensure text layers are above the black solid
                textLayerLeft.moveBefore(blackSolid);
                textLayerRight.moveBefore(blackSolid);

                // Define the path to your expression files dynamically
                var scriptFile = new File($.fileName);
                var scriptFolder = scriptFile.parent;
                var exprFolderPath = scriptFolder.fsName + "/expressions/";

                // Read expressions from external files
                var exprTextLeft = readExpressionFromFile(exprFolderPath + "4TokenNameWithNesting-Frame-TC.txt");
                var exprTextRight = readExpressionFromFile(exprFolderPath + "2TokenNameNoNesting-Coloring.txt");
                var exprFillColor = readExpressionFromFile(exprFolderPath + "2TokenNameNoNesting-FillColor.txt");

                // Apply expressions to the text layers
                if (exprTextLeft !== "") {
                    textLayerLeft.property("Source Text").expression = exprTextLeft;
                }

                if (exprTextRight !== "") {
                    textLayerRight.property("Source Text").expression = exprTextRight;
                }

                // Apply Fill Effect to "2TokenNameNoNesting-Coloring" and assign color expression
                var fillEffect = textLayerRight.Effects.addProperty("ADBE Fill"); // Adds a Fill effect
                fillEffect.name = "Fill";

                if (exprFillColor !== "") {
                    // Apply the expression to the Fill effect's Color property
                    // "ADBE Fill-0002" is the Color property
                    fillEffect.property("ADBE Fill-0002").expression = exprFillColor;
                }

                app.endUndoGroup();

                alert('Burnins have been added successfully.');
            } catch (error) {
                app.endUndoGroup();
                alert("Error adding burnins: " + error.toString());
            }
        }

        function removeBurnins() {
            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) {
                alert("Please select an active composition.");
                return;
            }

            app.beginUndoGroup("Remove Burnins");

            try {
                // Find the burninFlag layer
                var burninFlag = comp.layer("BurninsFlag");
                if (!burninFlag) {
                    alert("Burnins have not been added.");
                    app.endUndoGroup();
                    return;
                }

                // Retrieve the original height from the marker
                var markerProperty = burninFlag.property("Marker");
                if (!markerProperty) {
                    alert("Burnins flag layer does not contain markers.");
                    app.endUndoGroup();
                    return;
                }

                var marker = markerProperty.valueAtTime(0, false);
                if (!marker || !marker.comment) {
                    alert("Original height information is missing.");
                    app.endUndoGroup();
                    return;
                }

                var comment = marker.comment;
                var originalHeight = parseInt(comment.split(":")[1]);

                if (isNaN(originalHeight)) {
                    alert("Original height information is invalid.");
                    app.endUndoGroup();
                    return;
                }

                // Restore the original composition height
                comp.height = originalHeight;

                // Remove the burninFlag layer
                burninFlag.remove();

                // Remove the black solid layer
                var blackSolid = comp.layer("BurninBackground");
                if (blackSolid) {
                    blackSolid.remove();
                }

                // Remove the text layers
                var textLayerLeft = comp.layer("4TokenNameWithNesting-Frame-TC");
                if (textLayerLeft) {
                    textLayerLeft.remove();
                }
                var textLayerRight = comp.layer("2TokenNameNoNesting-Coloring");
                if (textLayerRight) {
                    textLayerRight.remove();
                }

                app.endUndoGroup();

                alert('Burnins have been removed successfully.');
            } catch (error) {
                app.endUndoGroup();
                alert("Error removing burnins: " + error.toString());
            }
        }
    }

    burninManager(this);
})();
