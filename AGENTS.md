# Instructions for Jules

Jules must follow the instructions in this file.

## Creating a new webpage

For creating a new webpage for the Interpolnet Project, follow these steps:

1. Read `README.md` to get a comprehensive overview of the Interpolnet Project.
2. Read `Directory.md` to get an understanding of what webpages exist already in the Interpolnet Project.
3. Create a new entry in `Directory.md` for your new webpage. The entry should include the following information:
   - The path to the new subdirectory that will contain all the files relating to the new webpage.
   - A short description of the webpage.
4. Add a link to the new webpage into `index.html`. Make sure to follow the existing layout in `index.html`.
5. Create the new subdirectory for the new webpage. The subdirectory should be at the top level of this repository, at the same level as the subdirectories for all the other webpage's subdirectories.
6. Create all files for the new webpage in this new subdirectory. This includes the `index.html` file, all CSS style files, all JS script files, and any other files used for the webpage.

Each webpage must only use HTML, CSS, and Javascript.

If you need to use an existing Javascript library, make sure to include the appropriate script tag in the header of the HTML file in order to import it.

## Modifying existing webpages

When modifying an existing webpage, make sure to ONLY modify, create, or delete files that are inside that webpage's subdirectory.

## Verification

Every time you create a new webpage or modify an existing webpage, you MUST test that webpage in order to ensure it's working properly in the browser before submitting your changes. To do this testing, run the following Python script like so, where `<webpage_name>` is the name of the webpage that you are testing.

```sh
python test_webpage.py <webpage_name>
```

For example, in order to test the webpage named `ants`, you would run the testing script like this:

```sh
python test_webpage.py ants
```

Running this script will simulate a browser in order to verify that the webpage loads and runs correctly. Then the script will take a screenshot of the webpage and save it to a local file.

If this test throws any errors, then you MUST address those errors.

Also, take a look at the screenshot of the webpage that the script produces. ENSURE that the screenshot visually corresponds to what the user requested.
