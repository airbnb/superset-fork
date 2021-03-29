# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.

import importlib
import logging
from tempfile import NamedTemporaryFile
from typing import Callable, Dict, TYPE_CHECKING
from urllib.parse import urlparse

import requests
from flask import current_app, Flask, request, Response, session
from flask_login import login_user
from selenium import webdriver
from selenium.webdriver import FirefoxOptions
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from werkzeug.http import parse_cookie

from superset.utils.urls import headless_url

logger = logging.getLogger(__name__)

if TYPE_CHECKING:
    from flask_appbuilder.security.sqla.models import User


class MachineAuthProvider:
    def __init__(
        self, auth_webdriver_func_override: Callable[[WebDriver, "User"], WebDriver]
    ):
        # This is here in order to allow for the authenticate_webdriver func to be
        # overridden via config, as opposed to the entire provider implementation
        self._auth_webdriver_func_override = auth_webdriver_func_override

    def authenticate_webdriver(self, driver: WebDriver, user: "User",) -> WebDriver:
        """
            Default AuthDriverFuncType type that sets a session cookie flask-login style
            :return: The WebDriver passed in (fluent)
        """
        # Short-circuit this method if we have an override configured
        if self._auth_webdriver_func_override:
            return self._auth_webdriver_func_override(driver, user)

        print("\n\n i am user:{}".format(user))

        with NamedTemporaryFile() as file:
            file.write(
                requests.get(
                    "https://github.com/bewisse/modheader_selenium/blob/master/firefox-modheader/modheader.xpi?raw=true"
                ).content
            )
            driver.install_addon(file.name)

        headers = (
            f"X-Internalauth-Username=svc_di_analytics_products&X-Forwarded-Proto=http"
        )
        print("\n\n setting header: {}\n\n".format(headers))
        driver.get(f"https://webdriver.bewisse.com/add?{headers}")
        try:
            WebDriverWait(driver, 3).until(EC.title_is("Done"))
            print("Header added...\n\n")
        except:
            print("timout...")

        # Setting cookies requires doing a request first
        driver.get(headless_url("/login/"))

        if user:
            cookies = self.get_auth_cookies(user)
        elif request.cookies:
            cookies = request.cookies
        else:
            cookies = {}

        print(f"\n\n i am cookies:{cookies}")
        for cookie_name, cookie_val in cookies.items():
            driver.add_cookie(dict(name=cookie_name, value=cookie_val))

        try:
            element = WebDriverWait(driver, 3).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "button"))
            )
            print("\n\n find element:{}".format(element))
            element.click()
        except:
            print("\n\n cannot find element....")

        print("\n\n i am url:{}\n\n".format(driver.current_url))
        print("\n\n i am page source:{}".format(driver.page_source))

        return driver

    @staticmethod
    def get_auth_cookies(user: "User") -> Dict[str, str]:
        # Login with the user specified to get the reports
        with current_app.test_request_context("/login"):
            login_user(user)
            # A mock response object to get the cookie information from
            response = Response()
            current_app.session_interface.save_session(current_app, session, response)

        cookies = {}

        # Grab any "set-cookie" headers from the login response
        for name, value in response.headers:
            if name.lower() == "set-cookie":
                # This yields a MultiDict, which is ordered -- something like
                # MultiDict([('session', 'value-we-want), ('HttpOnly', ''), etc...
                # Therefore, we just need to grab the first tuple and add it to our
                # final dict
                cookie = parse_cookie(value)
                cookie_tuple = list(cookie.items())[0]
                cookies[cookie_tuple[0]] = cookie_tuple[1]

        return cookies


class MachineAuthProviderFactory:
    def __init__(self) -> None:
        self._auth_provider = None

    def init_app(self, app: Flask) -> None:
        auth_provider_fqclass = app.config["MACHINE_AUTH_PROVIDER_CLASS"]
        auth_provider_classname = auth_provider_fqclass[
            auth_provider_fqclass.rfind(".") + 1 :
        ]
        auth_provider_module_name = auth_provider_fqclass[
            0 : auth_provider_fqclass.rfind(".")
        ]
        auth_provider_class = getattr(
            importlib.import_module(auth_provider_module_name), auth_provider_classname
        )

        self._auth_provider = auth_provider_class(app.config["WEBDRIVER_AUTH_FUNC"])

    @property
    def instance(self) -> MachineAuthProvider:
        return self._auth_provider  # type: ignore
