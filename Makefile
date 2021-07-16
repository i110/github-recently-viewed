generated/out.zip: FORCE
	zip generated/out.zip \
	    manifest.json \
	    content_script.js \
	    main.css \
	    icons/*

FORCE:
