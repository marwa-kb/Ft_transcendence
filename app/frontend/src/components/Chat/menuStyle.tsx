const menuStyle = {
	'& .MuiPaper-root' : {
		borderRadius: '10px',
	},
	'& .MuiMenu-list': {
		width: '200px',
		backgroundColor: 'rgba(31, 31, 31, 0.95)',
		border: '1px solid lightgray',
		borderRadius: '10px',
	},
	'& .MuiMenuItem-root': {
		fontFamily: 'Rajdhani',
		fontSize: '1.25rem',
		fontWeight: 600,
		color: 'white',
	},
	'& .MuiMenuItem-root:hover': {
		backgroundColor: 'rgb(0, 0, 0)',
	},
	'& .MuiMenuItem-root:not(:last-of-type)': {
		borderBottom: '1px dotted white',
	}
};

export default menuStyle;
