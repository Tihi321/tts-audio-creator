import { createEffect, createSignal, createMemo } from "solid-js";
import { styled } from "solid-styled-components";
import { listen, emit } from "@tauri-apps/api/event";
import { get, map, filter, includes, isEqual, isEmpty } from "lodash";
import { VOICES_LIST } from "./constants";
import { TextInput } from "./components/inputs/TextInput";
import { Button } from "./components/inputs/Button";
import { Checkbox } from "./components/inputs/Checkbox";
import { FolderIcon } from "./components/icons/FolderIcon";
import { openFile } from "./hooks/file";
import { loadLocalLanguage, saveLocalLanguage, loadUsedFile, saveUseFile } from "./hooks/local";

const Container = styled("div")`
  margin: 0;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const Main = styled("div")`
  display: flex;
  padding: 8px;
  flex: 1;
  flex-direction: column;
  background: ${(props) => props?.theme?.colors.ui6};
`;

const Textarea = styled("textarea")`
  width: 100%;
  height: 100%;
  flex: 1;
  color: ${(props) => props?.theme?.colors.ui6};
  border: 3px solid ${(props) => props?.theme?.colors.ui6};
  border-radius: 6px;
  padding: 8px;
  font-size: 16px;
  resize: none;
  &:focus {
    border: 3px solid ${(props) => props?.theme?.colors.ui1};
  }
`;

const FileContainer = styled("div")`
  width: 100%;
  height: 100%;
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  flex-direction: column;
`;

const FilePath = styled("div")`
  color: ${(props) => props?.theme?.colors.text};
`;

const FilePathButton = styled(Button)`
  width: 200px;
  height: 200px;
`;

const Footer = styled("div")`
  display: flex;
  flex-direction: row;
  padding: 4px;
  background-color: ${(props) => props?.theme?.colors.ui5};
  transition: transform 0.3s ease;
  gap: 4px;
  height: 54px;
`;

const FooterSelect = styled("select")`
  width: 550px;
  border-radius: 6px;
  border-width: 3px;
  border-style: solid;
  border-color: ${(props) => props?.theme?.colors.ui6};
`;

const CreateButton = styled(Button)`
  width: 200px;
`;

const FileCheckbox = styled(Checkbox)`
  width: 300px;
  flex-direction: column;
`;

type VoicesList = Array<{ name: string; lang: string }>;

export const App = () => {
  const [voices, setVoices] = createSignal<VoicesList>([]);
  const [selectedVoice, setSelectedVoice] = createSignal("");
  const [useFile, setUseFile] = createSignal(false);
  const [file, setFile] = createSignal("");
  const [text, setText] = createSignal("");
  const [name, setName] = createSignal("");

  const shortVoices = createMemo(() =>
    filter(voices(), (voice) => includes(VOICES_LIST, voice.lang))
  );

  const voicesAvailable = createMemo(() => !isEmpty(voices()));

  createEffect(async () => {
    try {
      emit("get_voices_list", {});
    } catch (error) {
      console.error("Error invoking voices_list command:", error);
    }
  });

  createEffect(async () => {
    const unlisten = await listen("get_voices_list_response", (event: any) => {
      const voices_list: VoicesList = map(get(event, ["payload"], []), (voice) => ({
        name: get(voice, [0], ""),
        lang: get(voice, [1], ""),
      }));

      setVoices(voices_list);
    });

    return () => unlisten();
  });

  createEffect(async () => {
    const unlisten = await listen("create_audio_response", () => {
      setName("");
      setText("");
      setFile("");
    });

    return () => unlisten();
  });

  createEffect(() => {
    const language = loadLocalLanguage();
    setSelectedVoice(language);
  });

  createEffect(() => {
    const useFile = loadUsedFile();
    setUseFile(useFile);
  });

  const onCreateAudio = () => {
    if (useFile()) {
      emit("create_audio_from_file", {
        file: file(),
        name: name() || "output",
        voice: selectedVoice(),
      });
    } else {
      emit("create_audio_from_text", {
        text: text(),
        name: name() || "output",
        voice: selectedVoice(),
      });
    }
  };

  const onOpenExportFolder = () => {
    emit("open_export_folder", {});
  };

  const onOpenFile = () => {
    try {
      openFile().then((selected) => setFile(get(selected, ["path"])));
    } catch (error) {
      console.error("Error opening file dialog:", error);
    }
  };

  const fetchVoices = () => {
    emit("refresh_voices_list", {});
  };

  return (
    <Container>
      <Main>
        {!voicesAvailable() && (
          <FileContainer>
            <FilePathButton datatype="secondary" onClick={fetchVoices}>
              Get Voices
            </FilePathButton>
          </FileContainer>
        )}
        {voicesAvailable() && useFile() && (
          <FileContainer>
            <FilePathButton datatype="secondary" onClick={onOpenFile}>
              <FolderIcon />
            </FilePathButton>
            <FilePath>{file()}</FilePath>
          </FileContainer>
        )}
        {voicesAvailable() && !useFile() && (
          <Textarea
            value={text()}
            onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
          />
        )}
      </Main>
      <Footer>
        <Button onClick={onOpenExportFolder}>
          <FolderIcon />
        </Button>
        <FooterSelect
          onChange={(event) => {
            setSelectedVoice(event.target.value as string);
            saveLocalLanguage(event.target.value as string);
          }}
        >
          {map(shortVoices(), (voice) => (
            <option value={voice.name} selected={isEqual(voice.name, selectedVoice())}>
              {voice.name} - {voice.lang}
            </option>
          ))}
        </FooterSelect>
        <TextInput
          type="text"
          value={name()}
          onInput={(value) => setName(value)}
          placeholder="Name"
        />
        <CreateButton onClick={onCreateAudio}>Create audio</CreateButton>
        <FileCheckbox
          value={useFile()}
          onChange={(value) => {
            setUseFile(value);
            saveUseFile(value);
          }}
          label="Use file"
        />
      </Footer>
    </Container>
  );
};
