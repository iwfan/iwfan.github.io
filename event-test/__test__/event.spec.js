const prepareDOM = () => {
	const htmlTemplate = `
		<div id="outer">
				<div id="middle">
					<div id="inner"></div>
				</div>
		</div>`

	document.body.innerHTML = htmlTemplate;
}

describe('native event modal test', () => {

	beforeEach(() => {
		prepareDOM();
	})

	it('native event modal', () => {

		const outer = document.getElementById('outer');
		const middle = document.getElementById('middle');
		const inner = document.getElementById('inner');

		const arr = [];

		outer.addEventListener('click', () => {
			arr.push('o-d')
		}, { capture: true})


		middle.addEventListener('click', () => {
			arr.push('m-d')
		}, { capture: true})


		inner.addEventListener('click', () => {
			arr.push('i-d')
		}, { capture: true})

		outer.addEventListener('click', () => {
			arr.push('o-u')
		})


		middle.addEventListener('click', () => {
			arr.push('m-u')
		})


		inner.addEventListener('click', () => {
			arr.push('i-u')
		})

		inner.dispatchEvent(new MouseEvent('click', {
			bubbles: true,
			cancelable: true,
			view: window
		}));


		expect(arr).toStrictEqual([
			'o-d',
			'm-d',
			'i-d',
			'i-u',
			'm-u',
			'o-u'
		])
	})

	it('event equality', () => {

		const outer = document.getElementById('outer');
		const middle = document.getElementById('middle');
		const inner = document.getElementById('inner');

		const events = {};

		outer.addEventListener('click', (e) => {
			events.outer_down = e;
			e.custom_detail = { a: 'b' }
		}, { capture: true})


		middle.addEventListener('click', (e) => {
			events.middle_down = e;
		}, { capture: true})


		inner.addEventListener('click', (e) => {
			events.inner_down = e;
		}, { capture: true})

		outer.addEventListener('click', (e) => {
			events.outer_up = e;
		})


		middle.addEventListener('click', (e) => {
			events.middle_up = e;
		})


		inner.addEventListener('click', (e) => {
			events.inner_up = e;
		})

		inner.dispatchEvent(new MouseEvent('click', {
			bubbles: true,
			cancelable: true,
			view: window
		}));

		expect(events.outer_down).toBe(events.outer_up)
		expect(events.outer_down).toBe(events.inner_up)

		expect(events.outer_up.custom_detail).toEqual({a: 'b'})
		expect(events.middle_down.custom_detail).toEqual({a: 'b'})
	})

	it('can stop propagation', () => {

		const outer = document.getElementById('outer');
		const middle = document.getElementById('middle');
		const inner = document.getElementById('inner');

		const arr = [];

		outer.addEventListener('click', () => {
			arr.push('o-d')
		}, { capture: true})


		middle.addEventListener('click', () => {
			arr.push('m-d')
		}, { capture: true})


		inner.addEventListener('click', (e) => {
			e.stopPropagation();
			arr.push('i-d')
		}, { capture: true})

		outer.addEventListener('click', () => {
			arr.push('o-u')
		})


		middle.addEventListener('click', () => {
			arr.push('m-u')
		})


		inner.addEventListener('click', (e) => {
			arr.push('i-u')
		})

		inner.dispatchEvent(new MouseEvent('click', {
			bubbles: true,
			cancelable: true,
			view: window
		}));


		expect(arr).toStrictEqual([
			'o-d',
			'm-d',
			'i-d',
			// 'i-u',
			// 'm-u',
			// 'o-u'
		])
	})

})
