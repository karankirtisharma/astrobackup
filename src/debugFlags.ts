/** Dev/QA switches via query string:
 *  ?tier=low|mid|high  ?nofx=1  ?noreflect=1  ?motion=full|reduced */
const params = new URLSearchParams(window.location.search);

const tierParam = params.get('tier');
const motionParam = params.get('motion');

export const DEBUG_FLAGS = {
  tierOverride:
    tierParam === 'low' || tierParam === 'mid' || tierParam === 'high'
      ? (tierParam as 'low' | 'mid' | 'high')
      : null,
  noPostFx: params.get('nofx') === '1',
  noReflect: params.get('noreflect') === '1',
  motionOverride:
    motionParam === 'full' || motionParam === 'reduced' ? motionParam : null,
};
