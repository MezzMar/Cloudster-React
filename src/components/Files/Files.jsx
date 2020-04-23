import Box from "@material-ui/core/Box";
import ClickAwayListener from "@material-ui/core/ClickAwayListener";
import Grow from "@material-ui/core/Grow";
import MenuItem from "@material-ui/core/MenuItem";
import MenuList from "@material-ui/core/MenuList";
import Paper from "@material-ui/core/Paper";
import Popper from "@material-ui/core/Popper";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import React from "react";
import { useHistory } from "react-router-dom";
import { getIcon } from "../SF/helpers";

const useStyles = makeStyles((theme) => ({
	popper: { zIndex: 10000 },
	text: { color: "white" },
	image: { width: 164, height: 164 },
	paper: {
		margin: theme.spacing(1),
		backgroundColor: "inherit",
	},
	paperMod: {
		padding: theme.spacing(2),
		margin: "auto",
		maxWidth: 700,
	},
	modal: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
}));

const initialState = {
	open: false,
	openModal: false,
	progress: null,
	total: null,
};

const reducer = (state, action) => {
	switch (action.type) {
		case "start": {
			return {
				...state,
				progress: 0,
				total: action.total,
			};
		}
		case "add": {
			const received = state.progress + action.progress;
			console.log(`
			Received ${received} bytes of ${state.total} 
				${((received * 100) / state.total).toFixed(2)}%
			`);
			return {
				...state,
				progress: received,
			};
		}
		case "end": {
			return {
				...state,
				progress: 0,
				total: 0,
			};
		}

		default: {
			return { ...state, ...action };
		}
	}
};

const Files = ({
	file,
	...props
}) => {
	const classes = useStyles();
	const history = useHistory();

	const { ino, name, ext, isFile } = file;

	const [state, update] = React.useReducer(reducer, initialState);
	// const { state: globalState, dispatch } = useContext(saduwux);

	const { index, updateFolder, updatePlayer } = props;
	const anchorRef = React.useRef(null);
	const prevOpen = React.useRef(state.open);
	const nameToShow = name.length > 30
		? name.substring(0, 27).trim() + "..." + ext
		: name;

	React.useEffect(() => {
		if (prevOpen.current && !state.open) {
			anchorRef.current.focus();
		}
		prevOpen.current = state.open;
	}, [state.open]);

	const handleToggle = () => {
		update({ open: !state.open });
	};

	const handleClose = (event) => {
		if (anchorRef.current && anchorRef.current.contains(event.target)) {
			return;
		}
		update({ open: false });
	};

	const handleOpenModal = () => {
		update({ open: false });
		props.openModal(file)
	};

	const modRep = (id) => {
		updatePlayer(id);
		history.push("/reproductor");
	}; //changeRep

	const download = async (ino, filename) => {
		const response = await fetch(`/api/files/${ino}/download`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Authorization: localStorage.getItem("token"),
			},
		});
		const reader = response.body.getReader();
		const chunks = [];

		update({ type: "start", total: +response.headers.get("Content-Length") });
		// eslint-disable-next-line no-constant-condition
		while (true) {
			const { done, value } = await reader.read();

			if (done) {
				break;
			}
			chunks.push(value);
			update({ type: "add", progress: value.length });
		}

		const blob = new Blob(chunks);
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		document.body.appendChild(a); // we need to append the element to the dom -> otherwise it will not work in firefox
		a.click();
		a.remove(); //afterwards we remove the element again
	};

	const handleListKeyDown = (event) => {
		if (event.index === "Tab") {
			event.preventDefault();
			update({ open: true });
		}
	};

	const content = (
		<Paper color="primary" elevation={0} className={classes.paper}>
			<img src={getIcon(isFile, ext)} alt={ext} />
			<Typography
				variant="body2"
				className={props.useTheme ? classes.text : ""}
				style={{ overflowWrap: "break-word" }}>
				{nameToShow}
			</Typography>
		</Paper>
	);

	if (!isFile) {
		return (
			<Box
				onClick={() => updateFolder(ino)}
				onContextMenu={(e) => e.preventDefault()}
				textAlign="center"
				width={80}
				style={{ margin: "0px 5px 10px", cursor: "pointer" }}>
				{content}
			</Box>
		);
	} else return (
		<Box
			textAlign="center"
			width={80}
			style={{ margin: "0px 5px 10px", cursor: "pointer" }}>
			<a
				ref={anchorRef}
				aria-controls={state.open ? "menu-list-grow" : undefined}
				aria-haspopup="true"
				onClick={handleToggle}
				onContextMenu={(e) => e.preventDefault()}>
				{content}
			</a>
			<Popper
				className={classes.popper}
				open={state.open}
				anchorEl={anchorRef.current}
				role={undefined}
				transition
				disablePortal>
				{({ TransitionProps, placement }) => (
					<Grow
						{...TransitionProps}
						style={{
							transformOrigin:
								placement === "bottom"
									? "center top"
									: "center bottom",
						}}>
						<Paper>
							<ClickAwayListener onClickAway={handleClose}>
								<MenuList
									autoFocusItem={state.open}
									id="menu-list-grow"
									onKeyDown={handleListKeyDown}>
									<MenuItem onClick={() => download(ino, name)}>
										Descargar
									</MenuItem>
									<MenuItem onClick={() => modRep(ino)}>
										Reproducir
									</MenuItem>
									<MenuItem onClick={() => handleOpenModal()}>
										Información
									</MenuItem>
								</MenuList>
							</ClickAwayListener>
						</Paper>
					</Grow>
				)}
			</Popper>
		</Box>
	);
};

export default Files;
