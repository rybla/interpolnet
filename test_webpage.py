import sys
import http.server
import socketserver
import threading
import re
from functools import partial
from playwright.sync_api import sync_playwright, Error as PlaywrightError

help_message = "Usage: python test_webpage.py <webpage_name>"


def main():
    if len(sys.argv) != 2:
        print(help_message)
        sys.exit(1)

    serve_dir = "."
    webpage_name = sys.argv[1]

    handler_factory = partial(http.server.SimpleHTTPRequestHandler, directory=serve_dir)

    httpd = None
    server_thread = None

    try:
        httpd = socketserver.TCPServer(("", 0), handler_factory)
        port = httpd.server_address[1]
        target_url = f"http://localhost:{port}/{webpage_name}"

        server_thread = threading.Thread(target=httpd.serve_forever)
        server_thread.daemon = True
        server_thread.start()

        print(f"Serving at http://localhost:{port}")

        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={"width": 1280, "height": 1500})

            print(f"Navigating to {target_url}...")
            _ = page.goto(
                target_url,
                wait_until="domcontentloaded",
            )

            print("Waiting for 5 seconds...")
            page.wait_for_timeout(5000)

            screenshot_filepath = f"{webpage_name}/screenshot.png"
            _ = page.screenshot(path=screenshot_filepath)
            print(f"Screenshot successfully saved to '{screenshot_filepath}'")

            browser.close()

    except PlaywrightError as e:
        print(f"An error occurred during browser automation: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
    finally:
        if httpd:
            print("Shutting down HTTP server...")
            httpd.shutdown()
        if server_thread:
            server_thread.join()
        print("Server shut down successfully")


if __name__ == "__main__":
    main()
