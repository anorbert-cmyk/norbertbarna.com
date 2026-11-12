import React, { useEffect, useRef, useState } from "react";
import { Card } from "@astryxdesign/core/Card";
import { VStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Button } from "@astryxdesign/core/Button";
import { Banner } from "@astryxdesign/core/Banner";
import { api, messageOf } from "../api.js";
import { Loading } from "../ui.jsx";

export function Login({ token, disabled, onSignedIn }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState(token ? "verifying" : "form");
  const [error, setError] = useState("");
  const verified = useRef(false);

  // The link is single-use, so the token is posted exactly once.
  useEffect(() => {
    if (!token || verified.current) return;
    verified.current = true;
    window.history.replaceState(null, "", "/admin#/belepes");
    api("/verify", { method: "POST", body: { token } })
      .then(() => api("/me"))
      .then(onSignedIn, (failure) => { setError(messageOf(failure)); setState("form"); });
  }, [token]);

  const submit = async (event) => {
    event?.preventDefault();
    if (!email.trim()) return;
    setError("");
    setState("sending");
    try {
      await api("/login", { method: "POST", body: { email } });
      setState("sent");
    } catch (failure) {
      setError(messageOf(failure));
      setState("form");
    }
  };

  return (
    <div className="center-screen">
      <Card padding={6} width="100%" maxWidth={420}>
        {state === "verifying" ? <Loading label="Belépés" /> : (
          <form onSubmit={submit} noValidate>
            <VStack gap={4}>
              <VStack gap={1}>
                <Heading level={1}>Admin belépés</Heading>
                <Text color="secondary">barnanorbert.com</Text>
              </VStack>
              {disabled ? <Banner status="warning" title="Az admin nincs bekapcsolva" description="A szerveren hiányzik az ADMIN_SESSION_SECRET vagy az ADMIN_EMAIL beállítás." /> : null}
              {error ? <Banner status="error" title={error} /> : null}
              {state === "sent" ? (
                <Banner status="success" title="Nézd meg a postaládádat" description="Ha ez az admin e-mail-címe, elküldtem rá a belépő linket. 10 percig érvényes, és egyszer használható." />
              ) : (
                <>
                  <TextInput label="E-mail-cím" type="email" value={email} onChange={setEmail} autoComplete="email" htmlName="email" isRequired onEnter={submit} description="Belépő linket küldök az admin címére. Jelszó nincs." />
                  <Button label="Belépő link küldése" variant="primary" type="submit" isLoading={state === "sending"} isDisabled={disabled} />
                </>
              )}
            </VStack>
          </form>
        )}
      </Card>
    </div>
  );
}
